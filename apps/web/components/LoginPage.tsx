"use client";

import { LockKeyhole, Shield, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { panelClassName } from "@/components/terminal-ui";
import { ADMIN_ROUTE } from "@/lib/constants";
import { useAuth } from "@/components/use-auth";

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
    <main className="min-h-screen bg-[#05070d] text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1.05fr_460px] lg:px-6">
        <section className="hidden min-h-[640px] overflow-hidden rounded-2xl border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_32%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(5,7,13,0.98))] p-8 lg:block">
          <div className="flex h-full flex-col justify-between">
            <div>
              <div className="mb-4 inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-xs text-cyan-100">
                Forex AI Radar
              </div>
              <h1 className="max-w-xl text-4xl font-semibold leading-tight text-white">Private AI forex terminal with gated access, live routing, and operator controls.</h1>
              <p className="mt-4 max-w-lg text-base text-slate-400">
                Signal operations, analytics, demo execution, and Telegram delivery run behind per-user access keys. The surface is compact by design and built for repeated use.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: TrendingUp, title: "Live signal stack", body: "Real market scan, filtered entries, session-aware charting." },
                { icon: Shield, title: "Controlled access", body: "One key binds to one user. Revocation is instant." },
                { icon: LockKeyhole, title: "Private admin route", body: "Unlinked operator console for key issuance and oversight." },
              ].map((item) => (
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4" key={item.title}>
                  <item.icon size={18} className="text-cyan-300" />
                  <div className="mt-4 text-sm font-semibold text-white">{item.title}</div>
                  <p className="mt-2 text-sm text-slate-400">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid place-items-center">
          <div className={`${panelClassName()} w-full max-w-md rounded-2xl p-6 sm:p-7`}>
            <div className="mb-6">
              <div className="mb-2 inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-slate-300">
                Secure Login
              </div>
              <h2 className="text-2xl font-semibold text-white">Enter the terminal</h2>
              <p className="mt-2 text-sm text-slate-400">Use your assigned access key. On first login, the key binds to your user name.</p>
            </div>

            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                setError("");
                void signIn(accessKey, userName).then((session) => {
                  if (!session) {
                    setError("Login failed. Check the key and user name.");
                    return;
                  }
                  router.push(session.role === "ADMIN" ? ADMIN_ROUTE : "/");
                });
              }}
            >
              <div>
                <label className="mb-2 block text-sm text-slate-400">User name</label>
                <input
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 outline-none transition focus:border-cyan-300/40"
                  onChange={(event) => setUserName(event.target.value)}
                  placeholder="john"
                  value={userName}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Access key</label>
                <input
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 font-mono outline-none transition focus:border-cyan-300/40"
                  onChange={(event) => setAccessKey(event.target.value)}
                  placeholder="fxr_..."
                  value={accessKey}
                />
              </div>

              {error ? <div className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{error}</div> : null}

              <button
                className="rounded-xl border border-cyan-300/25 bg-cyan-300/12 px-4 py-3 font-medium text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-60"
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
