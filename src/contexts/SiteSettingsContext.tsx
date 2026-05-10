import React, { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { useSiteSettings } from "@/hooks/useSupabaseData";
import { themePresets, applyThemeColors } from "@/lib/themePresets";
import { getTheme } from "@/lib/theme";
import type { SiteSettings } from "@/lib/types";

const SITE_SETTINGS_KEY = "target_site_settings";

const defaultSettings: SiteSettings = {
  aboutTitle: "Target 🎯 কী?",
  aboutContent: "",
  featuresTitle: "বৈশিষ্ট্যসমূহ",
  featuresContent: "",
  contactTitle: "যোগাযোগ",
  contactContent: "",
  footerDescription: "আপনার পরীক্ষার প্রস্তুতি এখন আরও সহজ।",
  footerLinks: [
    { label: "পরীক্ষা সমূহ", url: "/exams" },
    { label: "ফলাফল", url: "/results" },
    { label: "নোটিস বোর্ড", url: "/notices" },
    { label: "সম্পর্কে", url: "/about" },
  ],
  socialLinks: [{ label: "Telegram", url: "https://t.me/FX_Ur_Target" }],
  brandName: "Target",
  brandEmoji: "🎯",
  heroTagline: "সীমাহীন অনুশীলন, নিখুঁত প্রস্তুতি",
  heroSubtitle: "",
  activeThemeId: "ocean-blue",
};

// Module-level cache so getLabel() still works as a plain function
let _cachedSettings: SiteSettings = defaultSettings;
export function getCachedSettings(): SiteSettings {
  return _cachedSettings;
}

const SiteSettingsContext = createContext<SiteSettings>(defaultSettings);

export function useSiteSettingsContext() {
  return useContext(SiteSettingsContext);
}

function applySettingsTheme(settings: SiteSettings) {
  const mode = getTheme();
  const themeId = settings.activeThemeId || "ocean-blue";

  if (themeId === "custom" && settings.customTheme) {
    applyThemeColors(settings.customTheme[mode], mode);
  } else {
    const preset = themePresets.find((t) => t.id === themeId);
    if (preset) {
      applyThemeColors(mode === "dark" ? preset.dark : preset.light, mode);
    }
  }

  // Persist to localStorage so initTheme() works on next page load
  try {
    localStorage.setItem(SITE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const { data: settings } = useSiteSettings();
  const value = settings || defaultSettings;
  const appliedRef = useRef<string>("");

  // Update module-level cache for getLabel
  _cachedSettings = value;

  // Apply theme colors whenever settings change
  useEffect(() => {
    const key = `${value.activeThemeId}-${JSON.stringify(value.customTheme || {})}`;
    if (key !== appliedRef.current) {
      appliedRef.current = key;
      applySettingsTheme(value);
    }
  }, [value]);

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}
