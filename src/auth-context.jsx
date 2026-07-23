import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./lib/supabase.js";

const USER_ID_KEY = "directnest:user_id:v1";

const AuthContext = createContext(null);

function getStoredUserId() {
  try {
    return localStorage.getItem(USER_ID_KEY) || null;
  } catch {
    return null;
  }
}

function setStoredUserId(id) {
  try {
    if (id) localStorage.setItem(USER_ID_KEY, id);
    else localStorage.removeItem(USER_ID_KEY);
  } catch {
    // ignore quota errors
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const userId = getStoredUserId();
    if (!userId) {
      setUser(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) {
      setUser(null);
      setLoading(false);
      return;
    }
    setUser(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const ensureUser = useCallback(async () => {
    let userId = getStoredUserId();
    if (userId) {
      await refreshUser();
      return userId;
    }
    const { data, error } = await supabase
      .from("users")
      .insert({ kyc_status: "unverified", is_verified: false })
      .select("id")
      .single();
    if (error || !data) return null;
    userId = data.id;
    setStoredUserId(userId);
    await refreshUser();
    return userId;
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

  const value = { user, loading, refreshUser, ensureUser, setKycPending };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
