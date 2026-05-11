"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Activity, Bot, Gauge, LayoutGrid, Radio, Settings, Wallet } from "lucide-react";

import type { TradeSignal } from "@/lib/types";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/signals", label: "Signals", icon: Radio },
  { href: "/analytics", label: "Analytics", icon: Gauge },
  { href: "/demo", label: "Demo", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function panelClassName(extra = "") {
  return `border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(8,12,20,0.96))] shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_14px_40px_rgba(2,6,23,0.35)] ${extra}`.trim();
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
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-[#05070d] text-slate-100">
      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[72px_minmax(0,1fr)]">
        <aside className="hidden border-r border-white/6 bg-[#060a12] xl:block">
          <div className="flex h-full flex-col items-center gap-5 py-4">
            <Link
              aria-label="Forex AI Radar home"
              className="grid size-11 place-items-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 font-mono text-sm font-black text-cyan-200"
              href="/"
            >
              FX
            </Link>
            <nav className="flex flex-1 flex-col gap-2">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    aria-label={item.label}
                    className={`grid size-11 place-items-center rounded-lg border transition ${
                      active
                        ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-100"
                        : "border-transparent text-slate-500 hover:border-cyan-300/20 hover:bg-cyan-300/10 hover:text-cyan-100"
                    }`}
                    href={item.href}
                    key={item.href}
                  >
                    <item.icon size={18} />
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-white/6 bg-[rgba(5,7,13,0.92)] px-4 py-4 backdrop-blur xl:px-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 font-mono text-[11px] text-cyan-100">
                      Forex AI Radar
                    </span>
                    <span className="hidden text-[11px] text-slate-500 sm:block">Railway + Vercel live</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bot size={16} className="text-cyan-300" />
                    <h1 className="text-xl font-semibold text-white sm:text-2xl">{title}</h1>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
                </div>
                {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:hidden">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
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

          <div className="px-3 py-3 sm:px-4 xl:px-5">{children}</div>
        </section>
      </div>
    </main>
  );
}
