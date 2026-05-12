"use client";

import { Activity, BarChart3, Key, Lock, Shield, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/use-auth";
import { ADMIN_ROUTE } from "@/lib/constants";

const features = [
  {
    icon: TrendingUp,
    title: "AI Signals",
    description: "Real-time forex analysis with ML confidence scoring.",
  },
  {
    icon: Shield,
    title: "Secure Access",
    description: "One key per user with instant revocation.",
  },
  {
    icon: BarChart3,
    title: "Live Analytics",
    description: "Track performance and pair diagnostics.",
  },
];

const stats = [
  { value: "8", label: "Pairs" },
  { value: "24/7", label: "Scanning" },
  { value: "Live", label: "Alerts" },
];

export function LoginPage() {
  const router = useRouter();
  const { signIn, loading, session } = useAuth();
  const [userName, setUserName] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    router.replace(session.role === "ADMIN" ? ADMIN_ROUTE : "/");
  }, [router, session]);

  return (
    <main className="min-h-screen bg-background text-foreground noise-overlay">
      <div className="pointer-events-none fixed inset-0 dot-grid" />
      
      {/* Ambient light effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 size-80 rounded-full bg-brand/5 blur-[100px]" />
        <div className="absolute -bottom-40 -right-40 size-80 rounded-full bg-brand/3 blur-[120px]" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-[1400px] lg:grid-cols-2">
        {/* Left - Branding */}
        <section className="hidden lg:flex flex-col justify-between p-10 xl:p-16">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-amber-600 font-mono text-sm font-black text-brand-foreground shadow-lg shadow-brand/25">
                FX
              </div>
              <div>
                <div className="text-base font-bold text-foreground">Forex AI Radar</div>
                <div className="text-xs text-muted-foreground">Trading Terminal</div>
              </div>
            </div>

            {/* Hero */}
            <div className="mt-20 max-w-md">
              <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <Activity size={12} className="text-brand" />
                AI-Powered Trading
              </div>
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground xl:text-4xl">
                Professional forex signals with{" "}
                <span className="text-gradient-gold">intelligent execution</span>
              </h1>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                A clean, private terminal for informed decision-making. Live market data, AI confidence scoring, and controlled access.
              </p>
            </div>

            {/* Stats */}
            <div className="mt-10 flex gap-8">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="font-mono text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="grid gap-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="premium-card flex items-start gap-4 p-4 card-hover"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
                  <feature.icon size={16} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{feature.title}</div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right - Login Form */}
        <section className="flex items-center justify-center p-6 lg:border-l lg:border-border lg:p-10">
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
            <div className="mb-10 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-amber-600 font-mono text-sm font-black text-brand-foreground shadow-lg shadow-brand/25">
                FX
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">Forex AI Radar</div>
                <div className="text-xs text-muted-foreground">Trading Terminal</div>
              </div>
            </div>

            <div className="premium-card p-6 sm:p-8 glow-gold">
              <div className="mb-8">
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-muted text-brand">
                  <Key size={20} />
                </div>
                <h2 className="text-xl font-bold text-foreground">Sign in</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter your credentials to access the terminal.
                </p>
              </div>

              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setError("");
                  void signIn(accessKey, userName).then((nextSession) => {
                    if (!nextSession) {
                      setError("Invalid credentials. Check your username and access key.");
                      return;
                    }
                    router.push(nextSession.role === "ADMIN" ? ADMIN_ROUTE : "/");
                  });
                }}
              >
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Username</label>
                  <input
                    className="w-full rounded-lg border border-border bg-secondary px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground transition-colors focus:border-brand focus:ring-1 focus:ring-brand/20"
                    onChange={(event) => setUserName(event.target.value)}
                    placeholder="Enter username"
                    value={userName}
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Access Key</label>
                  <input
                    className="w-full rounded-lg border border-border bg-secondary px-3.5 py-2.5 font-mono text-sm text-foreground placeholder-muted-foreground transition-colors focus:border-brand focus:ring-1 focus:ring-brand/20"
                    onChange={(event) => setAccessKey(event.target.value)}
                    placeholder="fxr_..."
                    value={accessKey}
                    type="password"
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-danger/30 bg-danger-muted px-3.5 py-2.5 text-sm text-danger">
                    {error}
                  </div>
                )}

                <button
                  className="btn-primary w-full rounded-lg px-4 py-2.5 text-sm disabled:opacity-50"
                  disabled={loading || !userName.trim() || !accessKey.trim()}
                  type="submit"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Activity size={14} className="animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    "Sign in to Terminal"
                  )}
                </button>
              </form>

              <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-border bg-secondary/50 p-3.5">
                <Lock size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Access is key-based. Contact your administrator for credentials.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
