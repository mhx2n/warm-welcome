import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import type { Session, User } from "@supabase/supabase-js";
import { isBackendConnectivityError, toUserFacingError } from "@/lib/backend";

export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  batch_id: string | null;
  batch_name: string | null;
  unique_number: number | null;
  unique_code: string | null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  isAdmin: false,
  loading: true,
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return (data as Profile) ?? null;
  } catch {
    return null;
  }
}

async function fetchIsAdmin(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isAdmin: false,
    loading: true,
  });

  const loadUserData = async (session: Session | null) => {
    if (!session?.user) {
      setState({ user: null, session: null, profile: null, isAdmin: false, loading: false });
      return;
    }
    // Defer DB calls so we don't block auth state callback
    setTimeout(async () => {
      const [profile, isAdmin] = await Promise.all([
        fetchProfile(session.user.id),
        fetchIsAdmin(session.user.id),
      ]);
      setState({ user: session.user, session, profile, isAdmin, loading: false });
    }, 0);
    // Set immediately with what we have
    setState((s) => ({ ...s, user: session.user, session, loading: true }));
  };

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      loadUserData(session);
    });

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!isMounted) return;
        loadUserData(session);
      })
      .catch(() => {
        if (!isMounted) return;
        setState({ user: null, session: null, profile: null, isAdmin: false, loading: false });
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (!state.user) return;
    const profile = await fetchProfile(state.user.id);
    setState((s) => ({ ...s, profile }));
  };

  return (
    <AuthContext.Provider value={{ ...state, refreshProfile }}>{children}</AuthContext.Provider>
  );
}

async function restoreLocalSession(email: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email?.toLowerCase() === email.toLowerCase()) {
      return session;
    }
  } catch {}
  return null;
}

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  } catch (error) {
    if (isBackendConnectivityError(error)) {
      const session = await restoreLocalSession(email);
      if (session?.user) return { session, user: session.user };
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    }
    throw toUserFacingError(error, "লগইন");
  }
}

export async function signUp(email: string, password: string, fullName?: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        data: fullName ? { full_name: fullName } : undefined,
      },
    });
    if (error) throw error;
    return data;
  } catch (error) {
    if (isBackendConnectivityError(error)) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    }
    throw toUserFacingError(error, "অ্যাকাউন্ট তৈরি");
  }
}

export async function signInWithGoogle() {
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: window.location.origin,
  });
  if (result.error) throw new Error(result.error.message || "Google সাইন-ইন ব্যর্থ");
  return result;
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    if (isBackendConnectivityError(error)) {
      const { error: localError } = await supabase.auth.signOut({ scope: "local" });
      if (!localError) return;
      throw toUserFacingError(localError, "লগআউট");
    }
    throw toUserFacingError(error, "লগআউট");
  }
}
