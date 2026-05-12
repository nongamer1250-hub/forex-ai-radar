"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  Gauge,
  LayoutGrid,
  LogOut,
  Menu,
  Radio,
  Settings,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/components/use-auth";
import type { TradeSignal, UserPreferences } from "@/lib/types";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/signals", label: "Signals", icon: Radio },
  { href: "/analytics", label: "Analytics", icon: Gauge },
  { href: "/demo", label: "Demo", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
];

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
  if (signal === "BUY") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (signal === "SELL") return "border-rose-500/30 bg-rose-500/10 text-rose-400";
  return "border-amber-500/30 bg-amber-500/10 text-amber-400";
}

export function statusTone(status: string) {
  if (status === "WIN") return "text-emerald-400";
  if (status === "LOSS") return "text-rose-400";
  if (status === "OPEN") return "text-cyan-400";
  return "text-zinc-500";
}

export function PageBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-400">
      <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
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
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon ? (
          <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-800/80 text-zinc-400">
            <Icon size={16} />
          </div>
        ) : null}
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
      </div>
      {detail ? <span className="text-xs font-medium text-zinc-500">{detail}</span> : null}
    </div>
  );
}

export function MetricPill({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div
      className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs ${
        tone ?? "border-zinc-800 bg-zinc-900/60 text-zinc-400"
      }`}
    >
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono font-medium text-zinc-200">{value}</span>
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
  const borderAccent =
    accent === "emerald"
      ? "border-emerald-500/20"
      : accent === "amber"
        ? "border-amber-500/20"
        : accent === "rose"
          ? "border-rose-500/20"
          : "border-cyan-500/20";

  const glowAccent =
    accent === "emerald"
      ? "shadow-emerald-500/5"
      : accent === "amber"
        ? "shadow-amber-500/5"
        : accent === "rose"
          ? "shadow-rose-500/5"
          : "shadow-cyan-500/5";

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${borderAccent} bg-zinc-900/50 p-5 shadow-lg ${glowAccent}`}>
      <div className="relative">
        <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</div>
        <div className="mt-2 font-mono text-3xl font-bold text-zinc-50">{value}</div>
        {footnote ? <div className="mt-3 text-xs leading-relaxed text-zinc-500">{footnote}</div> : null}
      </div>
    </div>
  );
}

export function MiniStatGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

export function ConfidenceMeter({ value }: { value: number }) {
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
  const tone = percent >= 80 ? "bg-emerald-500" : percent >= 60 ? "bg-cyan-500" : "bg-amber-500";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500">Confidence</span>
        <span className="font-mono font-medium text-zinc-200">{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full transition-all duration-500 ${tone}`} style={{ width: `${percent}%` }} />
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
    <section className={`rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden ${className}`.trim()}>
      <div className="border-b border-zinc-800/80 px-5 py-4">
        <SectionHeader title={title} detail={detail} icon={icon} />
      </div>
      <div className="p-5">{children}</div>
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
    <div className={`rounded-xl border px-3 py-2.5 ${tone ?? "border-zinc-800 bg-zinc-800/40"}`}>
      <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 font-mono text-sm text-zinc-100">{value}</div>
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
      className={`group w-full rounded-xl border text-left transition-all duration-200 ${
        active
          ? "border-cyan-500/30 bg-cyan-500/5 shadow-lg shadow-cyan-500/5"
          : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-800/50"
      } ${compact ? "p-3" : "p-4"}`}
      {...(onClick ? { onClick, type: "button" as const } : {})}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-sm font-semibold text-zinc-100">{signal.pair}</div>
          <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            {signal.setup_type ?? signal.setup_quality}
          </div>
        </div>
        <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium ${signalTone(signal.signal)}`}>
          {signal.signal}
        </span>
      </div>

      <div className={`mb-3 grid ${compact ? "grid-cols-3" : "grid-cols-4"} gap-2`}>
        <DataChip label="RR" value={String(signal.rr)} />
        <DataChip label="Score" value={String(signal.setup_score)} />
        <DataChip label="RSI" value={formatNumber(signal.rsi)} />
        {!compact ? <DataChip label="Bias" value={String(signal.learning_bias ?? 0)} /> : null}
      </div>

      <ConfidenceMeter value={signal.confidence} />

      <div className="mt-3 flex items-center justify-between text-[10px] font-medium text-zinc-500">
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
    <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-10 text-center">
      <div className="text-sm font-medium text-zinc-300">{title}</div>
      <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">{body}</p>
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      {/* Subtle background pattern */}
      <div className="pointer-events-none fixed inset-0 grid-pattern opacity-50" />
      
      <div className="relative mx-auto grid min-h-screen max-w-[1920px] xl:grid-cols-[260px_1fr]">
        {/* Desktop Sidebar */}
        <aside className="hidden xl:block">
          <div className="fixed top-0 left-0 h-screen w-[260px] border-r border-zinc-800/80 bg-[#0a0a0b]/95 backdrop-blur-xl">
            <div className="flex h-full flex-col p-4">
              {/* Logo */}
              <div className="mb-8 flex items-center gap-3 px-2">
                <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 font-mono text-sm font-bold text-zinc-900 shadow-lg shadow-cyan-500/20">
                  FX
                </div>
                <div>
                  <div className="font-semibold text-zinc-100">Forex AI Radar</div>
                  <div className="text-xs text-zinc-500">Trading Terminal</div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 space-y-1">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-zinc-800 text-zinc-100"
                          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                      }`}
                    >
                      <item.icon size={18} className={active ? "text-cyan-400" : ""} />
                      {item.label}
                      {active && <ArrowRight size={14} className="ml-auto text-zinc-500" />}
                    </Link>
                  );
                })}
              </nav>

              {/* User section */}
              <div className="mt-auto space-y-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="mb-2 text-sm font-medium text-zinc-200">{session?.user_name ?? "Guest"}</div>
                  <div className="flex flex-wrap gap-2">
                    {session?.role && (
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        session.role === "ADMIN" 
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                          : "bg-zinc-800 text-zinc-400"
                      }`}>
                        {session.role}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                  onClick={() => void signOut()}
                  type="button"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <section className="min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-[#0a0a0b]/90 backdrop-blur-xl">
            <div className="px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Mobile menu button */}
                    <button
                      className="flex xl:hidden size-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-400"
                      onClick={() => setMobileMenuOpen(true)}
                      type="button"
                    >
                      <Menu size={18} />
                    </button>
                    <PageBadge>Live Terminal</PageBadge>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">{title}</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">{subtitle}</p>
                </div>
                <div className="hidden sm:flex flex-wrap items-center gap-2">
                  {session && (
                    <MetricPill
                      label={session.role}
                      value={session.user_name}
                      tone={session.role === "ADMIN" ? "border-amber-500/20 bg-amber-500/10 text-amber-400" : undefined}
                    />
                  )}
                  {actions}
                </div>
              </div>
              
              {/* Mobile navigation pills */}
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2 xl:hidden scrollbar-hide">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-all ${
                        active
                          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                          : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <item.icon size={14} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="px-4 py-6 sm:px-6 lg:px-8 pb-24 xl:pb-8">
            <div className={density === "comfortable" ? "space-y-6" : "space-y-4"}>{children}</div>
          </div>
        </section>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-zinc-800 bg-[#0a0a0b] p-4">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 font-mono text-sm font-bold text-zinc-900">
                  FX
                </div>
                <span className="font-semibold text-zinc-100">Forex AI Radar</span>
              </div>
              <button
                className="flex size-8 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200"
                onClick={() => setMobileMenuOpen(false)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all ${
                      active
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                    }`}
                  >
                    <item.icon size={18} className={active ? "text-cyan-400" : ""} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-6 border-t border-zinc-800 pt-6">
              <button
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm font-medium text-zinc-400 hover:bg-zinc-800"
                onClick={() => void signOut()}
                type="button"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-[#0a0a0b]/95 backdrop-blur-xl xl:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium transition-colors ${
                  active ? "text-cyan-400" : "text-zinc-500"
                }`}
              >
                <item.icon size={20} />
                {item.label}
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
  const isActive = status === "OPEN";
  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
        isActive
          ? "border-cyan-500/20 bg-cyan-500/5"
          : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`size-2 rounded-full ${isActive ? "bg-cyan-400 animate-pulse" : "bg-zinc-600"}`} />
        <span className="text-sm font-medium text-zinc-300">
          {role === "telegram" ? "Telegram Trade" : role}: <span className="font-mono text-zinc-100">{pair}</span>
        </span>
      </div>
      <span className={`font-mono text-sm ${statusTone(status)}`}>{status}</span>
    </div>
  );
}

export function panelClassName(extra = "") {
  return `rounded-2xl border border-zinc-800 bg-zinc-900/50 ${extra}`.trim();
}

export function surfaceClassName(extra = "") {
  return `${panelClassName()} ${extra}`.trim();
}
