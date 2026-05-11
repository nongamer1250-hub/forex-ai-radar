"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Activity, Bot, Gauge, LayoutGrid, LogOut, Radio, Settings, Sparkles, Wallet } from "lucide-react";

import { useAuth } from "@/components/use-auth";
import type { TradeSignal, UserPreferences } from "@/lib/types";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutGrid, note: "Terminal status" },
  { href: "/signals", label: "Signals", icon: Radio, note: "Execution surface" },
  { href: "/analytics", label: "Analytics", icon: Gauge, note: "History and edge" },
  { href: "/demo", label: "Demo", icon: Wallet, note: "Paper account" },
  { href: "/settings", label: "Settings", icon: Settings, note: "User and routing" },
];

export function panelClassName(extra = "") {
  return `border border-white/7 bg-[linear-gradient(180deg,rgba(10,14,23,0.96),rgba(5,8,15,0.98))] shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_48px_rgba(2,6,23,0.36)] ${extra}`.trim();
}

export function formatNumber(value: number, suffix = "") {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)}${suffix}`;
}

export function formatSignalTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function signalTone(signal: TradeSignal["signal"]) {
  if (signal === "BUY") return "border-emerald-400/30 bg-emerald-400/12 text-emerald-200";
  if (signal === "SELL") return "border-rose-400/30 bg-rose-400/12 text-rose-200";
  return "border-amber-300/30 bg-amber-300/12 text-amber-100";
}

export function statusTone(status: string) {
  if (status === "WIN") return "text-emerald-300";
  if (status === "LOSS") return "text-rose-300";
  if (status === "OPEN") return "text-cyan-200";
  return "text-slate-400";
}

export function SectionHeader({
  title,
  detail,
  icon: Icon,
}: {
  title: string;
  detail?: string;
  icon?: typeof Activity;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {Icon ? <Icon size={15} className="text-slate-500" /> : null}
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
      </div>
      {detail ? <span className="font-mono text-[11px] text-slate-500">{detail}</span> : null}
    </div>
  );
}

export function MetricPill({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] ${tone ?? "border-white/10 bg-white/[0.04] text-slate-300"}`}>
      <span className="text-slate-500">{label}</span>
      <strong className="font-mono text-slate-100">{value}</strong>
    </div>
  );
}

export function ConfidenceMeter({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  const tone = percent >= 80 ? "bg-emerald-300" : percent >= 60 ? "bg-cyan-300" : "bg-amber-300";
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
        <span>Confidence</span>
        <strong className="text-slate-100">{percent}%</strong>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function TerminalShell({
  title,
  subtitle,
  actions,
  children,
  preferences,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
  preferences?: UserPreferences | null;
}) {
  const pathname = usePathname();
  const { session, signOut } = useAuth();
  const density = preferences?.density_mode ?? "compact";
  const notificationState = preferences?.notifications_enabled ? "On" : "Off";

  return (
    <main className="min-h-screen bg-[#04060b] text-slate-100">
      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden border-r border-white/6 bg-[linear-gradient(180deg,#060911,#05070d)] xl:block">
          <div className="flex h-full flex-col px-4 py-4">
            <Link className="mb-5 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3" href="/">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg border border-cyan-300/20 bg-[#07131f] font-mono text-sm font-black text-cyan-100">FX</div>
                <div>
                  <div className="text-sm font-semibold text-white">Forex AI Radar</div>
                  <div className="text-[11px] text-slate-500">Private operator terminal</div>
                </div>
              </div>
            </Link>

            <nav className="grid gap-1.5">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    className={`rounded-xl border px-3 py-3 transition ${
                      active
                        ? "border-cyan-300/25 bg-cyan-300/10"
                        : "border-transparent bg-transparent hover:border-white/8 hover:bg-white/[0.03]"
                    }`}
                    href={item.href}
                    key={item.href}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`grid size-9 place-items-center rounded-lg ${active ? "bg-cyan-300/12 text-cyan-100" : "bg-white/[0.03] text-slate-400"}`}>
                        <item.icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm font-medium ${active ? "text-white" : "text-slate-200"}`}>{item.label}</div>
                        <div className="truncate text-[11px] text-slate-500">{item.note}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto grid gap-3">
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles size={14} className="text-cyan-300" />
                  <span className="text-sm font-medium text-white">{session?.user_name ?? "Guest"}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {session ? <MetricPill label={session.role} value={preferences?.density_mode ?? "compact"} /> : null}
                </div>
              </div>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-slate-200 transition hover:border-white/15 hover:bg-white/[0.07]"
                onClick={() => {
                  void signOut();
                }}
                type="button"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-white/6 bg-[rgba(4,6,11,0.92)] px-4 py-4 backdrop-blur xl:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 font-mono text-[11px] text-cyan-100">
                      Railway + Vercel live
                    </span>
                    <span className="hidden text-[11px] text-slate-500 sm:block">Persistent key-scoped terminal state</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bot size={16} className="text-cyan-300" />
                    <h1 className="text-xl font-semibold text-white sm:text-2xl">{title}</h1>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {session ? <MetricPill label={session.role} value={session.user_name} /> : null}
                  {preferences ? <MetricPill label="Watchlist" value={String(preferences.watchlist.length)} /> : null}
                  {actions}
                </div>
              </div>

              {preferences ? (
                <div className="flex flex-wrap items-center gap-2">
                  <MetricPill label="Selected Pair" value={preferences.selected_pair} />
                  <MetricPill
                    label="Notifications"
                    value={notificationState}
                    tone={
                      preferences.notifications_enabled
                        ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                        : "border-amber-300/20 bg-amber-300/10 text-amber-100"
                    }
                  />
                  <MetricPill label="Density" value={preferences.density_mode} />
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:hidden">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                        active
                          ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-100"
                          : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/15"
                      }`}
                      href={item.href}
                      key={item.href}
                    >
                      <item.icon size={14} className="text-slate-500" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1720px]">
            <div className={`px-3 sm:px-4 xl:px-6 ${density === "comfortable" ? "py-5 space-y-5" : "py-3 space-y-3"}`}>{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
