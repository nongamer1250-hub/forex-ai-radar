"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  Bell,
  Bot,
  Gauge,
  LayoutGrid,
  LogOut,
  Radio,
  Settings,
  Shield,
  Sparkles,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/components/use-auth";
import type { TradeSignal, UserPreferences } from "@/lib/types";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutGrid, note: "Market desk" },
  { href: "/signals", label: "Signals", icon: Radio, note: "Execution board" },
  { href: "/analytics", label: "Analytics", icon: Gauge, note: "Performance" },
  { href: "/demo", label: "Demo", icon: Wallet, note: "Paper capital" },
  { href: "/settings", label: "Settings", icon: Settings, note: "Routing and profile" },
];

export function panelClassName(extra = "") {
  return [
    "border border-white/8 bg-[linear-gradient(180deg,rgba(8,14,24,0.96),rgba(4,9,16,0.98))]",
    "shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_18px_54px_rgba(2,6,23,0.32)]",
    "backdrop-blur-xl",
    extra,
  ]
    .join(" ")
    .trim();
}

export function surfaceClassName(extra = "") {
  return `${panelClassName("rounded-2xl")} ${extra}`.trim();
}

export function formatNumber(value: number, suffix = "") {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)}${suffix}`;
}

export function formatSignalTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(timestamp: string) {
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

export function PageEyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/16 bg-[linear-gradient(90deg,rgba(34,211,238,0.12),rgba(34,211,238,0.04))] px-3 py-1 font-mono text-[11px] text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.06)]">
      <span className="size-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.75)]" />
      {children}
    </span>
  );
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
    <div className="mb-1 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {Icon ? (
          <div className="grid size-9 place-items-center rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] text-slate-300 shadow-[0_8px_20px_rgba(2,6,23,0.18)]">
            <Icon size={15} />
          </div>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold tracking-[0.01em] text-white">{title}</h2>
        </div>
      </div>
      {detail ? <span className="font-mono text-[11px] text-slate-500">{detail}</span> : null}
    </div>
  );
}

export function MetricPill({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div
      className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[11px] ${
        tone ?? "border-white/10 bg-white/[0.04] text-slate-300 shadow-[0_8px_18px_rgba(2,6,23,0.16)]"
      }`}
    >
      <span className="text-slate-500">{label}</span>
      <strong className="font-mono text-slate-100">{value}</strong>
    </div>
  );
}

export function HeroMetric({
  label,
  value,
  footnote,
  accent = "cyan",
}: {
  label: string;
  value: string;
  footnote?: string;
  accent?: "cyan" | "emerald" | "amber" | "rose";
}) {
  const accentTone =
    accent === "emerald"
      ? "from-emerald-300/16 to-transparent text-emerald-200"
      : accent === "amber"
        ? "from-amber-300/16 to-transparent text-amber-100"
        : accent === "rose"
          ? "from-rose-300/16 to-transparent text-rose-200"
          : "from-cyan-300/16 to-transparent text-cyan-100";

  return (
    <div className={`${surfaceClassName()} relative overflow-hidden p-4 sm:p-5`}>
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${accentTone} opacity-60`} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="relative">
        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
        <div className="mt-2 font-mono text-[26px] font-semibold text-white sm:text-[30px]">{value}</div>
        {footnote ? <div className="mt-2 max-w-[22rem] text-xs leading-5 text-slate-400">{footnote}</div> : null}
      </div>
    </div>
  );
}

export function ConfidenceMeter({ value }: { value: number }) {
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
  const tone = percent >= 80 ? "from-emerald-300 to-cyan-300" : percent >= 60 ? "from-cyan-300 to-sky-300" : "from-amber-300 to-yellow-300";

  return (
    <div className="grid gap-2.5">
      <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
        <span>Confidence</span>
        <strong className="text-slate-100">{percent}%</strong>
      </div>
      <div className="h-2 overflow-hidden rounded-full border border-white/6 bg-white/[0.06]">
        <div className={`h-full rounded-full bg-gradient-to-r ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function TerminalSurface({
  title,
  detail,
  icon,
  children,
  className = "",
}: {
  title: string;
  detail?: string;
  icon?: typeof Activity;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${surfaceClassName()} overflow-hidden ${className}`.trim()}>
      <div className="border-b border-white/6 bg-white/[0.02] px-4 py-3 sm:px-5">
        <SectionHeader title={title} detail={detail} icon={icon} />
      </div>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

export function DataChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${tone ?? "border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]"}`}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1 font-mono text-sm text-white">{value}</div>
    </div>
  );
}

export function SignalCard({
  signal,
  active = false,
  compact = false,
  onClick,
}: {
  signal: TradeSignal;
  active?: boolean;
  compact?: boolean;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      className={`group w-full rounded-2xl border text-left transition ${
        active
          ? "border-cyan-300/30 bg-[linear-gradient(180deg,rgba(34,211,238,0.12),rgba(34,211,238,0.05))] shadow-[0_0_0_1px_rgba(34,211,238,0.1),0_18px_30px_rgba(8,47,73,0.18)]"
          : "border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] hover:border-white/14 hover:bg-white/[0.05]"
      } ${compact ? "p-3" : "p-4"}`}
      {...(onClick ? { onClick, type: "button" as const } : {})}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-sm font-semibold text-white">{signal.pair}</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">{signal.setup_type ?? signal.setup_quality}</div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 font-mono text-[11px] ${signalTone(signal.signal)}`}>{signal.signal}</span>
      </div>

      <div className={`mb-3 grid ${compact ? "grid-cols-3" : "grid-cols-4"} gap-2`}>
        <DataChip label="RR" value={String(signal.rr)} />
        <DataChip label="Score" value={String(signal.setup_score)} />
        <DataChip label="RSI" value={formatNumber(signal.rsi)} />
        {!compact ? <DataChip label="Bias" value={String(signal.learning_bias ?? 0)} /> : null}
      </div>

      <ConfidenceMeter value={signal.confidence} />

      <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-slate-500">
        <span>{signal.trade_status}</span>
        <span>{formatSignalTime(signal.timestamp)}</span>
      </div>
    </Wrapper>
  );
}

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
      <div className="text-sm font-medium text-white">{title}</div>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{body}</p>
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
  const now = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return (
    <main className="min-h-screen bg-[#04070d] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(34,211,238,0.08),transparent_22%),radial-gradient(circle_at_85%_8%,rgba(16,185,129,0.06),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_20%)]" />
      <div className="mx-auto grid min-h-screen max-w-[1800px] grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden bg-[linear-gradient(180deg,rgba(3,7,12,0.94),rgba(2,5,11,0.98))] xl:block">
          <div className="sticky top-0 flex h-screen flex-col gap-4 px-4 py-5">
            <div className={`${surfaceClassName("relative overflow-hidden")} p-4`}>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_60%)]" />
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-[18px] border border-cyan-300/16 bg-[linear-gradient(180deg,rgba(34,211,238,0.18),rgba(34,211,238,0.04))] font-mono text-base font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                  FX
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-white">Forex AI Radar</div>
                  <div className="text-xs text-slate-500">Execution terminal</div>
                </div>
              </div>
            </div>

            <div className="px-1 text-[11px] uppercase tracking-[0.22em] text-slate-600">Workspace</div>
            <nav className="grid gap-2">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    className={`rounded-[20px] border px-3 py-3 transition ${
                      active
                        ? "border-cyan-300/26 bg-[linear-gradient(180deg,rgba(34,211,238,0.13),rgba(34,211,238,0.06))] shadow-[0_14px_28px_rgba(8,47,73,0.14)]"
                        : "border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.012))] hover:border-white/14 hover:bg-white/[0.04]"
                    }`}
                    href={item.href}
                    key={item.href}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`grid size-10 place-items-center rounded-xl ${
                          active
                            ? "bg-cyan-300/14 text-cyan-100"
                            : "bg-white/[0.04] text-slate-400"
                        }`}
                      >
                        <item.icon size={17} />
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm font-medium ${active ? "text-white" : "text-slate-200"}`}>{item.label}</div>
                        <div className="truncate text-[11px] text-slate-500">{item.note}</div>
                      </div>
                      {active ? <ArrowUpRight size={13} className="ml-auto text-cyan-200" /> : null}
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto grid gap-3">
              <div className={`${surfaceClassName("relative overflow-hidden")} p-4`}>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]" />
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-cyan-300" />
                  <span className="text-sm font-medium text-white">{session?.user_name ?? "Guest"}</span>
                </div>
                <div className="grid gap-2">
                  {session ? (
                    <MetricPill
                      label="Role"
                      value={session.role}
                      tone={
                        session.role === "ADMIN"
                          ? "border-amber-300/20 bg-amber-300/10 text-amber-100"
                          : "border-white/10 bg-white/[0.04] text-slate-300"
                      }
                    />
                  ) : null}
                  {preferences ? <MetricPill label="Watchlist" value={String(preferences.watchlist.length)} /> : null}
                </div>
              </div>

              <button
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-4 py-3 text-sm text-slate-200 transition hover:border-white/16 hover:bg-white/[0.07]"
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
          <header className="sticky top-0 z-30 bg-[rgba(3,7,12,0.74)] backdrop-blur-2xl">
            <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-3 px-4 py-4 sm:px-5 xl:px-7">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <PageEyebrow>Live market workspace</PageEyebrow>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <h1 className="text-[30px] font-semibold tracking-tight text-white sm:text-[38px]">{title}</h1>
                    <MetricPill label="Updated" value={now} />
                  </div>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{subtitle}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {session ? (
                    <MetricPill
                      label={session.role}
                      value={session.user_name}
                      tone={
                        session.role === "ADMIN"
                          ? "border-amber-300/20 bg-amber-300/10 text-amber-100"
                          : "border-white/10 bg-white/[0.04] text-slate-300"
                      }
                    />
                  ) : null}
                  {preferences ? <MetricPill label="Default Pair" value={preferences.selected_pair} /> : null}
                  {actions}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 rounded-[24px] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-2">
                <MetricPill label="Infra" value="Railway + Vercel" />
                <MetricPill label="Feed" value="Yahoo Finance" tone="border-emerald-300/20 bg-emerald-300/10 text-emerald-100" />
                {preferences ? (
                  <MetricPill
                    label="Alerts"
                    value={preferences.notifications_enabled ? "On" : "Off"}
                    tone={
                      preferences.notifications_enabled
                        ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                        : "border-amber-300/20 bg-amber-300/10 text-amber-100"
                    }
                  />
                ) : null}
                {preferences ? <MetricPill label="Density" value={preferences.density_mode} /> : null}
              </div>

              <div className="grid grid-cols-5 gap-2 xl:hidden">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      className={`flex min-w-0 flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-center text-[11px] transition ${
                        active
                          ? "border-cyan-300/30 bg-cyan-300/[0.12] text-cyan-100 shadow-[0_10px_24px_rgba(8,47,73,0.14)]"
                          : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/14"
                      }`}
                      href={item.href}
                      key={item.href}
                    >
                      <item.icon size={16} className={active ? "text-cyan-200" : "text-slate-500"} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1800px] px-4 pb-24 pt-5 sm:px-5 xl:px-7 xl:pb-8">
            <div className={density === "comfortable" ? "space-y-5" : "space-y-4"}>{children}</div>
          </div>
        </section>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 border-t border-white/6 bg-[rgba(3,7,12,0.84)] px-3 py-3 backdrop-blur-2xl xl:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-3 py-2 shadow-[0_18px_30px_rgba(2,6,23,0.24)]">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                className={`pointer-events-auto flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] ${
                  active ? "bg-cyan-300/[0.12] text-cyan-100" : "text-slate-400"
                }`}
                href={item.href}
                key={item.href}
              >
                <item.icon size={16} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export function StatusBanner({
  role,
  pair,
  status,
}: {
  role: string;
  pair: string;
  status: string;
}) {
  return (
    <div className="rounded-2xl border border-cyan-300/18 bg-[linear-gradient(90deg,rgba(34,211,238,0.12),rgba(34,211,238,0.04))] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {role === "telegram" ? <Bell size={15} className="text-cyan-200" /> : <Shield size={15} className="text-cyan-200" />}
          <span className="text-sm text-white">{role === "telegram" ? "Telegram anchor trade" : "Active terminal signal"}</span>
        </div>
        <div className={`font-mono text-sm ${statusTone(status)}`}>
          {pair} / {status}
        </div>
      </div>
    </div>
  );
}

export function MiniStatGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}
