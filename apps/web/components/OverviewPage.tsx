"use client";

import { Activity, RefreshCw, ShieldCheck, Target, TrendingUp } from "lucide-react";

import { TradingViewWidget } from "@/components/TradingViewWidget";
import { ConfidenceMeter, MetricPill, SectionHeader, TerminalShell, formatNumber, panelClassName, signalTone } from "@/components/terminal-ui";
import { useAuth } from "@/components/use-auth";
import { useDashboardData } from "@/components/use-live-data";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${panelClassName()} rounded-lg p-3`}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 font-mono text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

export function OverviewPage() {
  const { session } = useAuth();
  const { data, forceScanNow, isPending } = useDashboardData();
  const analytics = data?.analytics;
  const preferences = data?.preferences;
  const watchlist = preferences?.watchlist ?? [];
  const watchlistSignals = (data?.signals ?? []).filter((signal) => watchlist.length === 0 || watchlist.includes(signal.pair));
  const topSignals = watchlistSignals.slice(0, 4);
  const chartPair = preferences?.selected_pair ?? watchlistSignals[0]?.pair ?? data?.signals[0]?.pair ?? "EURUSD";

  return (
    <TerminalShell
      title="Overview"
      subtitle="Live forex terminal with high-signal routing, Telegram delivery, and adaptive filtering."
      preferences={preferences}
      actions={
        <>
          <MetricPill label="Feed" value="Yahoo Finance" tone="border-emerald-300/20 bg-emerald-300/10 text-emerald-100" />
          {session?.role === "ADMIN" ? (
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-60"
              disabled={isPending}
              onClick={forceScanNow}
              type="button"
            >
              <RefreshCw size={16} />
              {isPending ? "Scanning" : "Force Scan"}
            </button>
          ) : null}
        </>
      }
    >
      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard label="Total Trades" value={String(analytics?.total_trades ?? 0)} />
        <StatCard label="Win Rate" value={formatNumber(analytics?.win_rate ?? 0, "%")} />
        <StatCard label="Active" value={String(analytics?.active_trades ?? 0)} />
        <StatCard label="Profit Factor" value={formatNumber(analytics?.profit_factor ?? 0)} />
      </section>

      <div className="grid gap-3 2xl:grid-cols-[minmax(0,1.3fr)_360px]">
        <div className={`${panelClassName()} overflow-hidden rounded-lg`}>
          <div className="flex items-center justify-between border-b border-white/6 px-3 py-2.5">
            <SectionHeader title="Market Focus" detail={chartPair} icon={TrendingUp} />
            <MetricPill label="Best Pair" value={analytics?.best_pair ?? "N/A"} />
          </div>
          <TradingViewWidget symbol={chartPair} />
        </div>

        <div className="grid gap-3">
          <section className={`${panelClassName()} rounded-lg p-3`}>
            <SectionHeader title="Signal Stack" detail={`${topSignals.length} live`} icon={Target} />
            <div className="grid gap-2">
              {topSignals.map((signal) => (
                <article className="rounded-lg border border-white/8 bg-white/[0.03] p-3" key={signal.signal_id}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <strong className="font-mono text-sm text-white">{signal.pair}</strong>
                    <span className={`rounded-md border px-2 py-0.5 text-[11px] ${signalTone(signal.signal)}`}>{signal.signal}</span>
                  </div>
                  <div className="mb-3 grid grid-cols-3 gap-2 font-mono text-[11px]">
                    <div><span className="text-slate-500">RR</span><strong className="mt-1 block text-white">{signal.rr}</strong></div>
                    <div><span className="text-slate-500">Score</span><strong className="mt-1 block text-white">{signal.setup_score}</strong></div>
                    <div><span className="text-slate-500">Bias</span><strong className="mt-1 block text-white">{signal.learning_bias ?? 0}</strong></div>
                  </div>
                  <ConfidenceMeter value={signal.confidence} />
                </article>
              ))}
            </div>
          </section>

          <section className={`${panelClassName()} rounded-lg p-3`}>
            <SectionHeader title="Execution Snapshot" icon={ShieldCheck} />
            <div className="grid gap-2 font-mono text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Wins</span><strong>{analytics?.wins ?? 0}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Losses</span><strong>{analytics?.losses ?? 0}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Avg RR</span><strong>{analytics?.avg_rr ?? 0}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Telegram Trade</span><strong>{data?.activeTelegramTrade?.pair ?? data?.latestTelegramTrade?.pair ?? "Idle"}</strong></div>
            </div>
          </section>

          <section className={`${panelClassName()} rounded-lg p-3`}>
            <SectionHeader title="Learning State" icon={Activity} />
            <div className="grid gap-2 font-mono text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Closed trades used</span><strong>{data?.learningStatus?.closed_trades_used ?? 0}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Net outcome score</span><strong>{data?.learningStatus?.net_outcome_score ?? 0}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Strongest pair</span><strong>{data?.learningStatus?.strongest_pair ?? "N/A"}</strong></div>
            </div>
          </section>

          <section className={`${panelClassName()} rounded-lg p-3`}>
            <SectionHeader title="Personal Watchlist" detail={String(watchlist.length)} icon={Target} />
            <div className="grid gap-2 sm:grid-cols-2">
              {watchlist.map((pair) => {
                const signal = (data?.signals ?? []).find((item) => item.pair === pair);
                return (
                  <div className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2" key={pair}>
                    <div className="flex items-center justify-between gap-2">
                      <strong className="font-mono text-sm text-white">{pair}</strong>
                      {signal ? <span className={`rounded-md border px-2 py-0.5 text-[11px] ${signalTone(signal.signal)}`}>{signal.signal}</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </TerminalShell>
  );
}
