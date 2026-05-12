"use client";

import { LockKeyhole, Shield, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { MetricPill, surfaceClassName } from "@/components/terminal-ui";
import { useAuth } from "@/components/use-auth";
import { ADMIN_ROUTE } from "@/lib/constants";

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
    <main className="min-h-screen bg-[#04070d] text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-[1680px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1.25fr)_460px] lg:px-6">
        <section className="hidden overflow-hidden rounded-[32px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_26%),linear-gradient(180deg,rgba(8,14,25,0.96),rgba(3,7,12,0.98))] p-8 shadow-[0_26px_80px_rgba(2,6,23,0.32)] lg:block">
          <div className="flex h-full flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-xs text-cyan-100">
                <span className="size-1.5 rounded-full bg-cyan-300" />
                Forex AI Radar
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <MetricPill label="Infra" value="Railway + Vercel" />
                <MetricPill label="Feed" value="Real FX Data" tone="border-emerald-300/20 bg-emerald-300/10 text-emerald-100" />
              </div>
              <h1 className="mt-7 max-w-4xl text-5xl font-semibold leading-tight text-white xl:text-6xl">
                A cleaner private forex terminal for signals, analytics, demo execution, and controlled operator access.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-400">
                The interface is built for repeated decision-making, not marketing. Access is key-based, data remains live, and the workspace stays tuned for dense trading context across desktop and mobile.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  icon: TrendingUp,
                  title: "Signal command",
                  body: "Chart-first execution workspace with ranked pairs, confidence, and setup diagnostics.",
                },
                {
                  icon: Shield,
                  title: "Controlled access",
                  body: "One key binds to one user. Revocation invalidates active sessions and future access.",
                },
                {
                  icon: LockKeyhole,
                  title: "Hidden admin route",
                  body: "Private operator console for sensitive controls, routing, and user key issuance.",
                },
              ].map((item) => (
                <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5" key={item.title}>
                  <item.icon size={18} className="text-cyan-300" />
                  <div className="mt-5 text-base font-semibold text-white">{item.title}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid place-items-center">
          <div className={`${surfaceClassName("relative overflow-hidden")} w-full max-w-md p-6 sm:p-7`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_70%)]" />
            <div className="mb-7">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[11px] text-slate-300">
                Secure Login
              </div>
              <h2 className="mt-4 text-3xl font-semibold text-white">Enter the terminal</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Use the access key assigned to you. On first login, that key binds permanently to your user name.
              </p>
            </div>

            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                setError("");
                void signIn(accessKey, userName).then((nextSession) => {
                  if (!nextSession) {
                    setError("Login failed. Check the user name and access key.");
                    return;
                  }
                  router.push(nextSession.role === "ADMIN" ? ADMIN_ROUTE : "/");
                });
              }}
            >
              <div>
                <label className="mb-2 block text-sm text-slate-400">User name</label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none transition focus:border-cyan-300/35"
                  onChange={(event) => setUserName(event.target.value)}
                  placeholder="john"
                  value={userName}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Access key</label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-sm outline-none transition focus:border-cyan-300/35"
                  onChange={(event) => setAccessKey(event.target.value)}
                  placeholder="fxr_..."
                  value={accessKey}
                />
              </div>

              {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

              <button
                className="rounded-2xl border border-cyan-300/25 bg-cyan-300/12 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-60"
                disabled={loading}
                type="submit"
              >
                {loading ? "Checking access..." : "Login"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
