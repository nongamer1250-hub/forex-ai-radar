"use client";

import { useRouter } from "next/navigation";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { clearAuthToken, getAuthToken, getCurrentSession, login, logout } from "@/lib/api";
import type { AuthSession } from "@/lib/types";

interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  signIn: (accessKey: string, userName: string) => Promise<AuthSession | null>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<AuthSession | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshSession() {
    const token = getAuthToken();
    if (!token) {
      setSession(null);
      setLoading(false);
      return null;
    }
    const nextSession = await getCurrentSession();
    if (!nextSession) {
      clearAuthToken();
    }
    setSession(nextSession);
    setLoading(false);
    return nextSession;
  }

  useEffect(() => {
    void refreshSession();
    const interval = window.setInterval(() => {
      void refreshSession();
    }, 10000);
    return () => window.clearInterval(interval);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      async signIn(accessKey: string, userName: string) {
        setLoading(true);
        const nextSession = await login(accessKey, userName);
        setSession(nextSession);
        setLoading(false);
        return nextSession;
      },
      async signOut() {
        await logout();
        setSession(null);
        router.push("/login");
      },
      refreshSession,
    }),
    [loading, router, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}

export function AuthGate({
  children,
  requireAdmin = false,
}: {
  children: ReactNode;
  requireAdmin?: boolean;
}) {
  const router = useRouter();
  const { loading, session } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!session) {
      router.replace("/login");
      return;
    }
    if (requireAdmin && session.role !== "ADMIN") {
      router.replace("/");
    }
  }, [loading, requireAdmin, router, session]);

  if (loading || !session || (requireAdmin && session.role !== "ADMIN")) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#05070d] px-6 text-slate-300">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-5 font-mono text-sm">Authenticating terminal...</div>
      </div>
    );
  }

  return <>{children}</>;
}
