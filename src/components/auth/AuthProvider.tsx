"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Profile, Villager } from "@/types/database";

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  villager: Villager | null;
  loading: boolean;
  villagerLoading: boolean;
  refreshVillager: () => Promise<void>;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [villager, setVillager] = useState<Villager | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [villagerLoading, setVillagerLoading] = useState(false);

  useEffect(() => {
    // Supabase未接続の間は地図の閲覧自体は動かしたいので、未ログイン状態のまま何もしない
    if (!isSupabaseConfigured) return;

    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchVillager = useCallback(async (userId: string) => {
    const supabase = createClient();
    setVillagerLoading(true);
    const { data } = await supabase
      .from("villagers")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setVillager(data);
    setVillagerLoading(false);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) {
      // ログアウト（またはSupabase未接続）という外部状態に合わせてprofile/villagerを同期する意図的なsetState
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(null);
      setVillager(null);
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled) setProfile(data);
      });

    fetchVillager(user.id);

    return () => {
      cancelled = true;
    };
  }, [user, fetchVillager]);

  const refreshVillager = useCallback(async () => {
    if (!user) return;
    await fetchVillager(user.id);
  }, [user, fetchVillager]);

  const signInWithDiscord = async () => {
    if (!isSupabaseConfigured) {
      console.warn("Supabaseが未設定のため、ログインできません（.env.localを確認してください）");
      return;
    }
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        villager,
        loading,
        villagerLoading,
        refreshVillager,
        signInWithDiscord,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
