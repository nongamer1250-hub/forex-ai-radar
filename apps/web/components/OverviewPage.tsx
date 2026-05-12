"use client";

import { Activity, Gauge, RefreshCw, ShieldCheck, Sparkles, Target, TrendingUp } from "lucide-react";

import { TradingViewWidget } from "@/components/TradingViewWidget";
import {
  ConfidenceMeter,
  DataChip,
  EmptyState,
  HeroMetric,
  MetricPill,
  MiniStatGrid,
  SignalCard,
  StatusBanner,
  TerminalShell,
  TerminalSurface,
  formatNumber,
} from "@/components/terminal-ui";
import { useAuth } from "@/components/use-auth";
import { useDashboardData } from "@/components/use-live-data";

export function OverviewPage() {
  const { session } = useAuth();
  const { data, forceScanNow, isPending } = useDashboardData();
  const analytics = data?.analytics;
  const preferences = data?.preferences;
  const watchlist = preferences?.watchlist ?? [];
  const watchlistSignals = (data?.signals ?? []).filter((signal) => watchlist.length === 0 || watchlist.includes(signal.pair));
  const featuredSignal = watchlistSignals[0] ?? data?.signals[0] ?? null;
  const chartPair = preferences?.selected_pair ?? featuredSignal?.pair ?? "EURUSD";
  const telegramTrade = data?.activeTelegramTrade ?? data?.latestTelegramTrade ?? null;
  const topSignals = watchlistSignals.slice(0, 4);

  return (
    <TerminalShell
      title="Overview"
      subtitle="Run the terminal from a cleaner command deck: one lead market view, a compact execution rail, and the current learning posture."
      preferences={preferences}
      actions={
        <>
          <MetricPill label="Best Pair" value={analytics?.best_pair ?? "N/A"} />
          {session?.role === "ADMIN" ? (
            <button
              className="inline-flex h-8 items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 text-sm text-cyan-100 transition hover:bg-cyan-300/18 disabled:opacity-60"
              disabled={isPending}
              onClick={forceScanNow}
              type="button"
            >
              <RefreshCw size={14} />
              {isPending ? "Scanning" : "Force Scan"}
            </button>
          ) : null}
        </>
      }
    >
      <MiniStatGrid>
        <HeroMetric label="Total Trades" value={String(analytics?.total_trades ?? 0)} footnote="Persisted across the live learning ledger." />
        <HeroMetric label="Win Rate" value={formatNumber(analytics?.win_rate ?? 0, "%")} footnote="Resolved outcomes only." accent="emerald" />
        <HeroMetric label="Active Trades" value={String(analytics?.active_trades ?? 0)} footnote="Open positions still being tracked." />
        <HeroMetric label="Profit Factor" value={formatNumber(analytics?.profit_factor ?? 0)} footnote="Gross profit divided by gross loss." accent="amber" />
      </MiniStatGrid>

      {telegramTrade ? <StatusBanner role="telegram" pair={telegramTrade.pair} status={telegramTrade.trade_status} /> : null}

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.45fr)_380px]">
        <div className="grid gap-4">
          <TerminalSurface title="Market Command Deck" detail={chartPair} icon={TrendingUp} className="overflow-hidden">
            <div className="grid gap-4">
              {featuredSignal ? (
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_0.9fr]">
                  <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(135deg,rgba(9,18,30,0.96),rgba(5,10,18,0.98))] p-5 shadow-[0_18px_40px_rgba(2,6,23,0.2)]">
                    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-2xl font-semibold text-white">{featuredSignal.pair}</div>
                        <div className="mt-1 text-sm text-slate-400">{featuredSignal.setup_type ?? featuredSignal.setup_quality}</div>
                      </div>
                      <MetricPill label="Session" value={featuredSignal.session} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <DataChip label="Entry" value={String(featuredSignal.entry)} />
                      <DataChip label="SL" value={String(featuredSignal.sl)} tone="border-rose-300/16 bg-rose-300/8" />
                      <DataChip label="TP" value={String(featuredSignal.tp)} tone="border-emerald-300/16 bg-emerald-300/8" />
                      <DataChip label="RR" value={String(featuredSignal.rr)} />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <DataChip label="Signal" value={featuredSignal.signal} tone="border-cyan-300/14 bg-cyan-300/8" />
                      <DataChip label="State" value={featuredSignal.trade_status} />
                      <DataChip label="Trend Bias" value={featuredSignal.trend_bias} />
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5">
                    <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
                      <Sparkles size={15} className="text-cyan-300" />
                      Signal Quality
                    </div>
                    <ConfidenceMeter value={featuredSignal.confidence} />
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <DataChip label="Score" value={String(featuredSignal.setup_score)} />
                      <DataChip label="RSI" value={formatNumber(featuredSignal.rsi)} />
                      <DataChip label="Bias" value={String(featuredSignal.learning_bias ?? 0)} />
                    </div>
                    <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
                      <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">Operator note</div>
                      <p className="text-sm leading-6 text-slate-400">
                        The lead setup shown here is the highest-priority visible pair after watchlist and confidence filtering.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState title="No featured signal yet" body="When the live scanner finds a qualifying setup, this area becomes the main trade focus surface." />
              )}

              <div className="overflow-hidden rounded-[26px] border border-white/8 bg-[#050a11] p-2 shadow-[0_22px_50px_rgba(2,6,23,0.28)]">
                <TradingViewWidget symbol={chartPair} />
              </div>
            </div>
          </TerminalSurface>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
            <TerminalSurface title="Lead Pairs" detail={`${topSignals.length} priority pairs`} icon={Target}>
              {topSignals.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {topSignals.map((signal, index) => (
                    <div className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))] p-4" key={signal.signal_id}>
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="font-mono text-base font-semibold text-white">{signal.pair}</div>
                          <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">Priority {index + 1}</div>
                        </div>
                        <MetricPill label="RR" value={String(signal.rr)} />
                      </div>
                      <div className="mb-3 grid grid-cols-3 gap-2">
                        <DataChip label="Signal" value={signal.signal} />
                        <DataChip label="Score" value={String(signal.setup_score)} />
                        <DataChip label="Status" value={signal.trade_status} />
                      </div>
                      <ConfidenceMeter value={signal.confidence} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No lead pairs available" body="Once your watchlist receives live market states, the terminal will rank them here." />
              )}
            </TerminalSurface>

            <TerminalSurface title="Market Pulse" icon={Gauge}>
              <div className="grid gap-3">
                <div className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-4">
                  <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">Execution posture</div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <DataChip label="Best Pair" value={analytics?.best_pair ?? "N/A"} />
                    <DataChip label="Anchor Trade" value={telegramTrade?.pair ?? "Idle"} />
                    <DataChip label="Average RR" value={String(analytics?.avg_rr ?? 0)} />
                    <DataChip label="Open Trades" value={String(analytics?.active_trades ?? 0)} />
                  </div>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
                  <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">Learning posture</div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between text-sm text-slate-400">
                      <span>Closed trades used</span>
                      <span className="font-mono text-white">{data?.learningStatus?.closed_trades_used ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-400">
                      <span>Strongest pair</span>
                      <span className="font-mono text-white">{data?.learningStatus?.strongest_pair ?? "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-400">
                      <span>Strongest setup</span>
                      <span className="font-mono text-white">{data?.learningStatus?.strongest_setup ?? "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-400">
                      <span>Net outcome score</span>
                      <span className="font-mono text-white">{data?.learningStatus?.net_outcome_score ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TerminalSurface>
          </div>
        </div>

        <div className="grid content-start gap-4">
          <TerminalSurface title="Live Signal Stack" detail={`${watchlistSignals.length} visible`} icon={Target}>
            {watchlistSignals.length ? (
              <div className="grid gap-3">
                {watchlistSignals.slice(0, 5).map((signal, index) => (
                  <SignalCard key={signal.signal_id} signal={signal} active={index === 0} compact />
                ))}
              </div>
            ) : (
              <EmptyState title="Watchlist is empty" body="Add pairs in Settings to build your personal signal stack." />
            )}
          </TerminalSurface>

          <TerminalSurface title="Execution Snapshot" icon={ShieldCheck}>
            <div className="grid gap-3 sm:grid-cols-2">
              <DataChip label="Wins" value={String(analytics?.wins ?? 0)} tone="border-emerald-300/16 bg-emerald-300/8" />
              <DataChip label="Losses" value={String(analytics?.losses ?? 0)} tone="border-rose-300/16 bg-rose-300/8" />
              <DataChip label="Average RR" value={String(analytics?.avg_rr ?? 0)} />
              <DataChip label="Anchor Trade" value={telegramTrade?.pair ?? "Idle"} />
            </div>
          </TerminalSurface>

          <TerminalSurface title="Learning Loop" icon={Activity}>
            <div className="grid gap-3 sm:grid-cols-2">
              <DataChip label="Closed Trades" value={String(data?.learningStatus?.closed_trades_used ?? 0)} />
              <DataChip label="Net Outcome" value={String(data?.learningStatus?.net_outcome_score ?? 0)} />
              <DataChip label="Strongest Pair" value={data?.learningStatus?.strongest_pair ?? "N/A"} />
              <DataChip label="Strongest Setup" value={data?.learningStatus?.strongest_setup ?? "N/A"} />
            </div>
          </TerminalSurface>
        </div>
      </div>
    </TerminalShell>
  );
}
