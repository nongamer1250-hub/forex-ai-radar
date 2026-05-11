"use client";

import { Activity, RefreshCw, ShieldCheck, Target, TrendingUp } from "lucide-react";

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

  return (
    <TerminalShell
      title="Overview"
      subtitle="Monitor the market, the active signal engine, and the learning loop from one chart-first command surface."
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

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.35fr)_420px]">
        <div className="grid gap-4">
          <TerminalSurface title="Market Focus" detail={chartPair} icon={TrendingUp} className="overflow-hidden">
            <div className="grid gap-4">
              {featuredSignal ? (
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-mono text-xl font-semibold text-white">{featuredSignal.pair}</div>
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
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="mb-4 text-sm font-medium text-white">Signal Quality</div>
                    <ConfidenceMeter value={featuredSignal.confidence} />
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <DataChip label="Score" value={String(featuredSignal.setup_score)} />
                      <DataChip label="RSI" value={formatNumber(featuredSignal.rsi)} />
                      <DataChip label="Bias" value={String(featuredSignal.learning_bias ?? 0)} />
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState title="No featured signal yet" body="When the live scanner finds a qualifying setup, this area becomes the main trade focus surface." />
              )}

              <TradingViewWidget symbol={chartPair} />
            </div>
          </TerminalSurface>
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
