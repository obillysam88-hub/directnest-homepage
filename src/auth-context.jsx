import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./lib/supabase.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    const au = authData?.user ?? null;
    setAuthUser(au);
    if (!au) {
      setUser(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", au.id)
      .maybeSingle();
    if (error || !data) {
      setUser({ id: au.id, email: au.email, kyc_status: "unverified", is_verified: false });
    } else {
      setUser(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshUser();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refreshUser();
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [refreshUser]);

  const ensureUser = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    const au = authData?.user ?? null;
    if (!au) return null;

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("id", au.id)
      .maybeSingle();

    if (!existing) {
      await supabase
        .from("users")
        .insert({
          id: au.id,
          email: au.email,
          kyc_status: "unverified",
          is_verified: false,
        })
        .eq("id", au.id);
    }
    await refreshUser();
    return au.id;
  }, [refreshUser]);

  const setKycPending = useCallback(async () => {
    const userId = await ensureUser();
    if (!userId) return;
    await supabase
      .from("users")
      .update({ kyc_status: "pending", is_verified: false })
      .eq("id", userId);
    await refreshUser();
  }, [ensureUser, refreshUser]);

  const value = { user, authUser, loading, refreshUser, ensureUser, setKycPending };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
