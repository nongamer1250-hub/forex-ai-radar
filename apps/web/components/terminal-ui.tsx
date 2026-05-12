"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Activity,
  ChevronRight,
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
  if (signal === "BUY") return "border-success/30 bg-success-muted text-success";
  if (signal === "SELL") return "border-danger/30 bg-danger-muted text-danger";
  return "border-warning/30 bg-warning-muted text-warning";
}

export function statusTone(status: string) {
  if (status === "WIN") return "text-success";
  if (status === "LOSS") return "text-danger";
  if (status === "OPEN") return "text-brand";
  return "text-muted-foreground";
}

export function PageBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <span className="size-1.5 rounded-full bg-brand pulse-soft" />
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
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div className="flex size-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            <Icon size={14} />
          </div>
        )}
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </div>
  );
}

export function MetricPill({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div
      className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs ${
        tone ?? "border-border bg-secondary text-muted-foreground"
      }`}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium text-foreground">{value}</span>
    </div>
  );
}

export function HeroMetric({
  label,
  value,
  footnote,
  accent = "default",
}: {
  label: string;
  value: string;
  footnote?: string;
  accent?: "default" | "success" | "warning" | "danger";
}) {
  const accentClasses = {
    default: "border-border",
    success: "border-success/20",
    warning: "border-warning/20",
    danger: "border-danger/20",
  };

  const valueClasses = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  };

  return (
    <div className={`premium-card p-5 ${accentClasses[accent]}`}>
      <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-2 font-mono text-2xl font-bold tracking-tight ${valueClasses[accent]}`}>{value}</div>
      {footnote && <div className="mt-2 text-xs text-muted-foreground">{footnote}</div>}
    </div>
  );
}

export function MiniStatGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

export function ConfidenceMeter({ value }: { value: number }) {
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
  const tone = percent >= 80 ? "bg-success" : percent >= 60 ? "bg-brand" : "bg-warning";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Confidence</span>
        <span className="font-mono font-semibold text-foreground">{percent}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-secondary">
        <div className={`h-full rounded-full transition-all duration-700 ease-out ${tone}`} style={{ width: `${percent}%` }} />
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
  noPadding = false,
}: {
  title: string;
  detail?: string;
  icon?: typeof Activity;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <section className={`premium-card overflow-hidden ${className}`.trim()}>
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <SectionHeader title={title} detail={detail} icon={icon} />
      </div>
      <div className={noPadding ? "" : "p-4"}>{children}</div>
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
    <div className={`rounded-lg border px-3 py-2 ${tone ?? "border-border bg-secondary/50"}`}>
      <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-medium text-foreground">{value}</div>
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
      className={`group w-full rounded-lg border text-left transition-all ${
        active
          ? "border-brand/40 bg-brand-muted glow-gold"
          : "border-border bg-card card-hover"
      } ${compact ? "p-3" : "p-4"}`}
      {...(onClick ? { onClick, type: "button" as const } : {})}
    >
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-sm font-bold text-foreground">{signal.pair}</div>
          <div className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {signal.setup_type ?? signal.setup_quality}
          </div>
        </div>
        <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${signalTone(signal.signal)}`}>
          {signal.signal}
        </span>
      </div>

      <div className={`mb-2.5 grid ${compact ? "grid-cols-3" : "grid-cols-4"} gap-1.5`}>
        <DataChip label="RR" value={String(signal.rr)} />
        <DataChip label="Score" value={String(signal.setup_score)} />
        <DataChip label="RSI" value={formatNumber(signal.rsi)} />
        {!compact && <DataChip label="Bias" value={String(signal.learning_bias ?? 0)} />}
      </div>

      <ConfidenceMeter value={signal.confidence} />

      <div className="mt-2.5 flex items-center justify-between text-[10px] font-medium text-muted-foreground">
        <span className={statusTone(signal.trade_status)}>{signal.trade_status}</span>
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
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary/30 px-6 py-10 text-center">
      <div className="text-sm font-medium text-foreground">{title}</div>
      <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">{body}</p>
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
    <main className="min-h-screen bg-background text-foreground noise-overlay">
      <div className="pointer-events-none fixed inset-0 dot-grid" />
      
      <div className="relative mx-auto grid min-h-screen max-w-[1920px] lg:grid-cols-[240px_1fr]">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block">
          <div className="fixed top-0 left-0 flex h-screen w-[240px] flex-col border-r border-border bg-background/95 backdrop-blur-xl">
            {/* Logo */}
            <div className="flex items-center gap-3 border-b border-border/50 px-5 py-4">
              <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-amber-600 font-mono text-xs font-black text-brand-foreground shadow-lg shadow-brand/20">
                FX
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">Forex AI Radar</div>
                <div className="text-[10px] font-medium text-muted-foreground">Trading Terminal</div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-0.5 px-3 py-4">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      active
                        ? "bg-brand-muted text-brand"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <item.icon size={16} />
                    {item.label}
                    {active && <ChevronRight size={14} className="ml-auto" />}
                  </Link>
                );
              })}
            </nav>

            {/* User section */}
            <div className="border-t border-border/50 p-3">
              <div className="rounded-lg border border-border bg-secondary/50 p-3">
                <div className="text-sm font-medium text-foreground">{session?.user_name ?? "Guest"}</div>
                {session?.role && (
                  <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    session.role === "ADMIN" 
                      ? "bg-brand-muted text-brand" 
                      : "bg-secondary text-muted-foreground"
                  }`}>
                    {session.role}
                  </span>
                )}
              </div>
              <button
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                onClick={() => void signOut()}
                type="button"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <section className="min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
            <div className="px-4 py-4 lg:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    {/* Mobile menu button */}
                    <button
                      className="flex lg:hidden size-8 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground"
                      onClick={() => setMobileMenuOpen(true)}
                      type="button"
                    >
                      <Menu size={16} />
                    </button>
                    <PageBadge>Live</PageBadge>
                  </div>
                  <h1 className="text-xl font-bold tracking-tight text-foreground lg:text-2xl">{title}</h1>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">{subtitle}</p>
                </div>
                <div className="hidden sm:flex flex-wrap items-center gap-2">
                  {session && (
                    <MetricPill
                      label=""
                      value={session.user_name}
                      tone={session.role === "ADMIN" ? "border-brand/30 bg-brand-muted text-brand" : undefined}
                    />
                  )}
                  {actions}
                </div>
              </div>
              
              {/* Mobile navigation pills */}
              <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 lg:hidden scrollbar-hide">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all ${
                        active
                          ? "border-brand/30 bg-brand-muted text-brand"
                          : "border-border bg-secondary text-muted-foreground"
                      }`}
                    >
                      <item.icon size={12} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="px-4 py-5 lg:px-6 pb-24 lg:pb-6">
            <div className={density === "comfortable" ? "space-y-5" : "space-y-4"}>{children}</div>
          </div>
        </section>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 border-r border-border bg-background p-4">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-amber-600 font-mono text-xs font-bold text-brand-foreground">
                  FX
                </div>
                <span className="text-sm font-bold text-foreground">Forex AI</span>
              </div>
              <button
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="space-y-0.5">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                      active
                        ? "bg-brand-muted text-brand"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-5 border-t border-border pt-5">
              <button
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
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
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-around px-1 py-1.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-medium transition-colors ${
                  active ? "text-brand" : "text-muted-foreground"
                }`}
              >
                <item.icon size={18} />
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
      className={`flex items-center justify-between rounded-lg border px-4 py-2.5 ${
        isActive
          ? "border-brand/30 bg-brand-muted"
          : "border-border bg-secondary/50"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`size-2 rounded-full ${isActive ? "bg-brand status-pulse" : "bg-muted-foreground"}`} />
        <span className="text-sm text-foreground">
          {role === "telegram" ? "Telegram" : role}: <span className="font-mono font-semibold">{pair}</span>
        </span>
      </div>
      <span className={`font-mono text-sm font-medium ${statusTone(status)}`}>{status}</span>
    </div>
  );
}

export function panelClassName(extra = "") {
  return `premium-card ${extra}`.trim();
}

export function surfaceClassName(extra = "") {
  return `${panelClassName()} ${extra}`.trim();
}
