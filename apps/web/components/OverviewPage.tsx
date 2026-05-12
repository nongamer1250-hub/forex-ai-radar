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
      subtitle="Your command center for live market signals, AI confidence scoring, and real-time trading analytics."
      preferences={preferences}
      actions={
        <>
          <MetricPill label="Best Pair" value={analytics?.best_pair ?? "N/A"} />
          {session?.role === "ADMIN" && (
            <button
              className="inline-flex h-8 items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 text-xs font-medium text-cyan-400 transition-all hover:bg-cyan-500/20 disabled:opacity-50"
              disabled={isPending}
              onClick={forceScanNow}
              type="button"
            >
              <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
              {isPending ? "Scanning..." : "Force Scan"}
            </button>
          )}
        </>
      }
    >
      {/* Hero Metrics */}
      <MiniStatGrid>
        <HeroMetric 
          label="Total Trades" 
          value={String(analytics?.total_trades ?? 0)} 
          footnote="All tracked trades in the system."
        />
        <HeroMetric 
          label="Win Rate" 
          value={formatNumber(analytics?.win_rate ?? 0, "%")} 
          footnote="Based on resolved outcomes."
          accent="emerald"
        />
        <HeroMetric 
          label="Active Trades" 
          value={String(analytics?.active_trades ?? 0)} 
          footnote="Currently open positions."
        />
        <HeroMetric 
          label="Profit Factor" 
          value={formatNumber(analytics?.profit_factor ?? 0)} 
          footnote="Gross profit / gross loss."
          accent="amber"
        />
      </MiniStatGrid>

      {/* Telegram Status */}
      {telegramTrade && (
        <StatusBanner role="telegram" pair={telegramTrade.pair} status={telegramTrade.trade_status} />
      )}

      {/* Main Content */}
      <div className="grid gap-4 2xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {/* Featured Signal & Chart */}
          <TerminalSurface title="Market Focus" detail={chartPair} icon={TrendingUp}>
            <div className="space-y-4">
              {featuredSignal ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {/* Signal Details */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-5">
                    <div className="mb-5 flex items-start justify-between">
                      <div>
                        <div className="font-mono text-2xl font-bold text-zinc-50">{featuredSignal.pair}</div>
                        <div className="mt-1 text-sm text-zinc-500">{featuredSignal.setup_type ?? featuredSignal.setup_quality}</div>
                      </div>
                      <MetricPill label="Session" value={featuredSignal.session} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <DataChip label="Entry" value={String(featuredSignal.entry)} />
                      <DataChip label="SL" value={String(featuredSignal.sl)} tone="border-rose-500/20 bg-rose-500/5" />
                      <DataChip label="TP" value={String(featuredSignal.tp)} tone="border-emerald-500/20 bg-emerald-500/5" />
                      <DataChip label="RR" value={String(featuredSignal.rr)} />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <DataChip label="Signal" value={featuredSignal.signal} tone="border-cyan-500/20 bg-cyan-500/5" />
                      <DataChip label="State" value={featuredSignal.trade_status} />
                      <DataChip label="Trend" value={featuredSignal.trend_bias} />
                    </div>
                  </div>

                  {/* Quality Analysis */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-5">
                    <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-200">
                      <Sparkles size={16} className="text-cyan-400" />
                      Signal Quality
                    </div>
                    <ConfidenceMeter value={featuredSignal.confidence} />
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <DataChip label="Score" value={String(featuredSignal.setup_score)} />
                      <DataChip label="RSI" value={formatNumber(featuredSignal.rsi)} />
                      <DataChip label="Bias" value={String(featuredSignal.learning_bias ?? 0)} />
                    </div>
                    <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                      <p className="text-xs leading-relaxed text-zinc-500">
                        Featured signal is the highest-priority pair after watchlist and confidence filtering.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState title="No featured signal" body="When the scanner finds a qualifying setup, it appears here." />
              )}

              {/* Chart */}
              <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-1">
                <TradingViewWidget symbol={chartPair} />
              </div>
            </div>
          </TerminalSurface>

          {/* Lead Pairs & Market Pulse */}
          <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
            <TerminalSurface title="Lead Pairs" detail={`${topSignals.length} signals`} icon={Target}>
              {topSignals.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {topSignals.map((signal, index) => (
                    <div key={signal.signal_id} className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-4">
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <div className="font-mono text-base font-semibold text-zinc-100">{signal.pair}</div>
                          <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                            Priority {index + 1}
                          </div>
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
                <EmptyState title="No lead pairs" body="Add pairs to your watchlist to see ranked signals here." />
              )}
            </TerminalSurface>

            <TerminalSurface title="Market Pulse" icon={Gauge}>
              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-4">
                  <div className="mb-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Execution Status</div>
                  <div className="grid gap-3">
                    <DataChip label="Best Pair" value={analytics?.best_pair ?? "N/A"} />
                    <DataChip label="Anchor Trade" value={telegramTrade?.pair ?? "Idle"} />
                    <DataChip label="Average RR" value={String(analytics?.avg_rr ?? 0)} />
                    <DataChip label="Open Trades" value={String(analytics?.active_trades ?? 0)} />
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="mb-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Learning Status</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Closed trades used</span>
                      <span className="font-mono text-zinc-200">{data?.learningStatus?.closed_trades_used ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Strongest pair</span>
                      <span className="font-mono text-zinc-200">{data?.learningStatus?.strongest_pair ?? "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Net outcome</span>
                      <span className="font-mono text-zinc-200">{data?.learningStatus?.net_outcome_score ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TerminalSurface>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <TerminalSurface title="Signal Stack" detail={`${watchlistSignals.length} signals`} icon={Target}>
            {watchlistSignals.length ? (
              <div className="space-y-3">
                {watchlistSignals.slice(0, 5).map((signal, index) => (
                  <SignalCard key={signal.signal_id} signal={signal} active={index === 0} compact />
                ))}
              </div>
            ) : (
              <EmptyState title="Empty watchlist" body="Configure your watchlist in Settings." />
            )}
          </TerminalSurface>

          <TerminalSurface title="Execution Snapshot" icon={ShieldCheck}>
            <div className="grid grid-cols-2 gap-3">
              <DataChip label="Wins" value={String(analytics?.wins ?? 0)} tone="border-emerald-500/20 bg-emerald-500/5" />
              <DataChip label="Losses" value={String(analytics?.losses ?? 0)} tone="border-rose-500/20 bg-rose-500/5" />
              <DataChip label="Avg RR" value={String(analytics?.avg_rr ?? 0)} />
              <DataChip label="Anchor" value={telegramTrade?.pair ?? "Idle"} />
            </div>
          </TerminalSurface>

          <TerminalSurface title="Learning Loop" icon={Activity}>
            <div className="grid grid-cols-2 gap-3">
              <DataChip label="Closed" value={String(data?.learningStatus?.closed_trades_used ?? 0)} />
              <DataChip label="Net Score" value={String(data?.learningStatus?.net_outcome_score ?? 0)} />
              <DataChip label="Best Pair" value={data?.learningStatus?.strongest_pair ?? "N/A"} />
              <DataChip label="Best Setup" value={data?.learningStatus?.strongest_setup ?? "N/A"} />
            </div>
          </TerminalSurface>
        </div>
      </div>
    </TerminalShell>
  );
}
