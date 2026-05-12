"use client";

import { Activity, BarChart3, Lock, Shield, TrendingUp, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/use-auth";
import { ADMIN_ROUTE } from "@/lib/constants";

const features = [
  {
    icon: TrendingUp,
    title: "AI-Powered Signals",
    description: "Real-time forex analysis with machine learning confidence scoring.",
  },
  {
    icon: Shield,
    title: "Secure Access",
    description: "One key per user. Revocation invalidates all active sessions.",
  },
  {
    icon: BarChart3,
    title: "Live Analytics",
    description: "Track performance metrics, win rates, and pair diagnostics.",
  },
];

const stats = [
  { value: "8", label: "Currency Pairs" },
  { value: "24/7", label: "Live Scanning" },
  { value: "Real-time", label: "Telegram Alerts" },
];

export function LoginPage() {
  const router = useRouter();
  const { signIn, loading, session } = useAuth();
  const [userName, setUserName] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) {
      return;
    }
    router.replace(session.role === "ADMIN" ? ADMIN_ROUTE : "/");
  }, [router, session]);

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/3 blur-[100px]" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[1fr_480px]">
        {/* Left side - Branding */}
        <section className="hidden lg:flex flex-col justify-between p-12">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 font-mono text-lg font-bold text-zinc-900 shadow-lg shadow-cyan-500/25">
                FX
              </div>
              <div>
                <div className="text-lg font-semibold text-zinc-100">Forex AI Radar</div>
                <div className="text-sm text-zinc-500">Trading Terminal</div>
              </div>
            </div>

            {/* Hero */}
            <div className="mt-16 max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-400">
                <Zap size={12} className="text-cyan-400" />
                AI-Powered Trading Terminal
              </div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-zinc-50 xl:text-5xl">
                Professional forex signals with{" "}
                <span className="text-cyan-400">intelligent execution</span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-zinc-400">
                A clean, private terminal built for informed decision-making. Live market data, AI confidence scoring, and controlled access in one focused workspace.
              </p>
            </div>

            {/* Stats */}
            <div className="mt-12 flex gap-8">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="font-mono text-2xl font-bold text-zinc-100">{stat.value}</div>
                  <div className="mt-1 text-sm text-zinc-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="grid gap-4 xl:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-zinc-700"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-zinc-800 text-cyan-400">
                  <feature.icon size={18} />
                </div>
                <div className="text-sm font-semibold text-zinc-200">{feature.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Right side - Login form */}
        <section className="flex items-center justify-center p-6 lg:border-l lg:border-zinc-800/80 lg:bg-zinc-900/30">
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 font-mono text-lg font-bold text-zinc-900 shadow-lg shadow-cyan-500/25">
                FX
              </div>
              <div>
                <div className="text-lg font-semibold text-zinc-100">Forex AI Radar</div>
                <div className="text-sm text-zinc-500">Trading Terminal</div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl shadow-black/20 backdrop-blur-xl sm:p-8">
              <div className="mb-8">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-zinc-800 text-cyan-400">
                  <Lock size={20} />
                </div>
                <h2 className="text-2xl font-bold text-zinc-50">Sign in</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  Enter your access key to continue. On first login, the key binds permanently to your username.
                </p>
              </div>

              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setError("");
                  void signIn(accessKey, userName).then((nextSession) => {
                    if (!nextSession) {
                      setError("Invalid credentials. Please check your username and access key.");
                      return;
                    }
                    router.push(nextSession.role === "ADMIN" ? ADMIN_ROUTE : "/");
                  });
                }}
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">Username</label>
                  <input
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                    onChange={(event) => setUserName(event.target.value)}
                    placeholder="Enter your username"
                    value={userName}
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">Access Key</label>
                  <input
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 font-mono text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                    onChange={(event) => setAccessKey(event.target.value)}
                    placeholder="fxr_..."
                    value={accessKey}
                    type="password"
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                    {error}
                  </div>
                )}

                <button
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-3 text-sm font-semibold text-zinc-900 shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={loading || !userName.trim() || !accessKey.trim()}
                  type="submit"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Activity size={16} className="animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    "Sign in to Terminal"
                  )}
                </button>
              </form>

              <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-800/30 px-4 py-3">
                <p className="text-xs leading-relaxed text-zinc-500">
                  Access is key-based and private. Contact your administrator if you need credentials.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
