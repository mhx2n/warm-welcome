const BACKEND_COOLDOWN_KEY = "target_backend_cooldown_until";
const BACKEND_COOLDOWN_MS = 90_000;

const CONNECTIVITY_ERROR_SNIPPETS = [
  "failed to fetch",
  "networkerror",
  "network request failed",
  "load failed",
  "connection timeout",
  "connection terminated due to connection timeout",
  "fetch failed",
  "status 544",
  "failed to run sql query",
];

export const BACKEND_CACHE_KEYS = {
  exams: "target_backend_cache_exams",
  notices: "target_backend_cache_notices",
  sections: "target_backend_cache_sections",
  subjects: "target_backend_cache_subjects",
  categories: "target_backend_cache_categories",
  reminders: "target_backend_cache_reminders",
  eventBanners: "target_backend_cache_event_banners",
} as const;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getCooldownUntil() {
  if (!canUseStorage()) return 0;

  const raw = window.localStorage.getItem(BACKEND_COOLDOWN_KEY);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) ? value : 0;
}

function setCooldownUntil(value: number) {
  if (!canUseStorage()) return;

  if (value > 0) {
    window.localStorage.setItem(BACKEND_COOLDOWN_KEY, String(value));
    return;
  }

  window.localStorage.removeItem(BACKEND_COOLDOWN_KEY);
}

export function isBackendCoolingDown() {
  return getCooldownUntil() > Date.now();
}

export function markBackendUnavailable() {
  setCooldownUntil(Date.now() + BACKEND_COOLDOWN_MS);
}

export function markBackendAvailable() {
  setCooldownUntil(0);
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  return "Unknown error";
}

export function isBackendConnectivityError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return CONNECTIVITY_ERROR_SNIPPETS.some((snippet) => message.includes(snippet));
}

export function toUserFacingError(error: unknown, action = "এই কাজ") {
  if (error instanceof Error && "__targetFriendly" in error) {
    return error;
  }

  if (!isBackendConnectivityError(error)) {
    return error instanceof Error ? error : new Error(getErrorMessage(error));
  }

  const friendlyError = new Error(
    `Backend সাময়িকভাবে unavailable, তাই ${action} সম্পন্ন করা যাচ্ছে না। কিছুক্ষণ পরে আবার চেষ্টা করুন।`
  ) as Error & { __targetFriendly?: boolean };
  friendlyError.__targetFriendly = true;
  return friendlyError;
}

export function readCachedData<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeCachedData<T>(key: string, data: T) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

export async function withBackendReadFallback<T>(
  fetcher: () => Promise<T>,
  fallback: () => T,
  onSuccess?: (data: T) => void,
): Promise<T> {
  if (isBackendCoolingDown()) {
    return fallback();
  }

  try {
    const data = await fetcher();
    markBackendAvailable();
    onSuccess?.(data);
    return data;
  } catch (error) {
    if (!isBackendConnectivityError(error)) {
      throw error;
    }

    markBackendUnavailable();
    return fallback();
  }
}

export async function withBackendWrite<T>(
  operation: () => Promise<T>,
  options?: {
    action?: string;
    suppressConnectivityError?: boolean;
  },
): Promise<T | null> {
  if (isBackendCoolingDown()) {
    if (options?.suppressConnectivityError) {
      return null;
    }

    throw toUserFacingError(new Error("Failed to fetch"), options?.action);
  }

  try {
    const result = await operation();
    markBackendAvailable();
    return result;
  } catch (error) {
    if (!isBackendConnectivityError(error)) {
      throw error instanceof Error ? error : new Error(getErrorMessage(error));
    }

    markBackendUnavailable();

    if (options?.suppressConnectivityError) {
      return null;
    }

    throw toUserFacingError(error, options?.action);
  }
}