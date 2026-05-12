"use client";

import { Activity, BrainCircuit, Gauge, RefreshCw, ShieldCheck, Sparkles, Target, TrendingUp } from "lucide-react";

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
      subtitle="Command center for live signals, AI scoring, and trading analytics."
      preferences={preferences}
      actions={
        <>
          <MetricPill label="Best" value={analytics?.best_pair ?? "N/A"} />
          {session?.role === "ADMIN" && (
            <button
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-brand/30 bg-brand-muted px-3 text-xs font-medium text-brand transition-all hover:bg-brand/20 disabled:opacity-50"
              disabled={isPending}
              onClick={forceScanNow}
              type="button"
            >
              <RefreshCw size={12} className={isPending ? "animate-spin" : ""} />
              {isPending ? "Scanning" : "Scan"}
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
          footnote="All tracked trades"
        />
        <HeroMetric 
          label="Win Rate" 
          value={formatNumber(analytics?.win_rate ?? 0, "%")} 
          footnote="Resolved outcomes"
          accent="success"
        />
        <HeroMetric 
          label="Active" 
          value={String(analytics?.active_trades ?? 0)} 
          footnote="Open positions"
        />
        <HeroMetric 
          label="Profit Factor" 
          value={formatNumber(analytics?.profit_factor ?? 0)} 
          footnote="Profit / Loss"
          accent="warning"
        />
      </MiniStatGrid>

      {/* Telegram Status */}
      {telegramTrade && (
        <StatusBanner role="telegram" pair={telegramTrade.pair} status={telegramTrade.trade_status} />
      )}

      {/* Main Grid */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {/* Featured Signal + Chart */}
          <TerminalSurface title="Market Focus" detail={chartPair} icon={TrendingUp}>
            <div className="space-y-4">
              {featuredSignal ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Signal Info */}
                  <div className="min-w-0 rounded-lg border border-border bg-secondary/30 p-4">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="font-mono text-xl font-bold text-foreground">{featuredSignal.pair}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{featuredSignal.setup_type ?? featuredSignal.setup_quality}</div>
                      </div>
                      <MetricPill label="" value={featuredSignal.session} />
                    </div>
                    <div className="grid min-w-0 grid-cols-2 gap-2 xl:grid-cols-4">
                      <DataChip label="Entry" value={String(featuredSignal.entry)} />
                      <DataChip label="SL" value={String(featuredSignal.sl)} tone="border-danger/20 bg-danger-muted" />
                      <DataChip label="TP" value={String(featuredSignal.tp)} tone="border-success/20 bg-success-muted" />
                      <DataChip label="RR" value={String(featuredSignal.rr)} />
                    </div>
                    <div className="mt-2 grid min-w-0 grid-cols-2 gap-2 2xl:grid-cols-3">
                      <DataChip label="Signal" value={featuredSignal.signal} tone="border-brand/20 bg-brand-muted" />
                      <DataChip label="State" value={featuredSignal.trade_status} />
                      <DataChip label="Trend" value={featuredSignal.trend_bias} />
                    </div>
                  </div>

                  {/* Quality */}
                  <div className="min-w-0 rounded-lg border border-border bg-secondary/30 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Sparkles size={14} className="text-brand" />
                      Signal Quality
                    </div>
                    <ConfidenceMeter value={featuredSignal.confidence} />
                    <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 xl:grid-cols-3">
                      <DataChip label="Score" value={String(featuredSignal.setup_score)} />
                      <DataChip label="RSI" value={formatNumber(featuredSignal.rsi)} />
                      <DataChip label="Bias" value={String(featuredSignal.learning_bias ?? 0)} />
                    </div>
                    <div className="mt-3 rounded-lg border border-border bg-card p-3">
                      <p className="text-xs text-muted-foreground">
                        Featured signal is highest-priority after watchlist filtering.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState title="No featured signal" body="Scanner will show qualifying setups here." />
              )}

              {/* Chart */}
              <div className="overflow-hidden rounded-lg border border-border">
                <TradingViewWidget symbol={chartPair} />
              </div>
            </div>
          </TerminalSurface>

          {/* Lead Pairs + Market Pulse */}
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <TerminalSurface title="Lead Pairs" detail={`${topSignals.length} signals`} icon={Target}>
              {topSignals.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {topSignals.map((signal, index) => (
                    <div key={signal.signal_id} className="min-w-0 rounded-lg border border-border bg-secondary/30 p-3.5">
                      <div className="mb-2.5 flex items-start justify-between">
                        <div className="min-w-0">
                          <div className="font-mono text-sm font-bold text-foreground">{signal.pair}</div>
                          <div className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                            #{index + 1}
                          </div>
                        </div>
                        <MetricPill label="" value={String(signal.rr) + " RR"} />
                      </div>
                      <div className="mb-2.5 grid min-w-0 grid-cols-2 gap-1.5 xl:grid-cols-3">
                        <DataChip label="Signal" value={signal.signal} />
                        <DataChip label="Score" value={String(signal.setup_score)} />
                        <DataChip label="Status" value={signal.trade_status} />
                      </div>
                      <ConfidenceMeter value={signal.confidence} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No lead pairs" body="Add pairs to watchlist in Settings." />
              )}
            </TerminalSurface>

            <TerminalSurface title="Market Pulse" icon={Gauge}>
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-secondary/30 p-3.5">
                  <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Execution</div>
                  <div className="grid gap-2">
                    <DataChip label="Best Pair" value={analytics?.best_pair ?? "N/A"} />
                    <DataChip label="Anchor" value={telegramTrade?.pair ?? "Idle"} />
                    <DataChip label="Avg RR" value={String(analytics?.avg_rr ?? 0)} />
                    <DataChip label="Open" value={String(analytics?.active_trades ?? 0)} />
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3.5">
                  <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Learning</div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Trades used</span>
                      <span className="font-mono font-medium text-foreground">{data?.learningStatus?.closed_trades_used ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Strongest</span>
                      <span className="font-mono font-medium text-foreground">{data?.learningStatus?.strongest_pair ?? "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Net score</span>
                      <span className="font-mono font-medium text-foreground">{data?.learningStatus?.net_outcome_score ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TerminalSurface>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <TerminalSurface title="Signal Stack" detail={`${watchlistSignals.length}`} icon={Target}>
            {watchlistSignals.length ? (
              <div className="max-h-[400px] space-y-3 overflow-y-auto pr-1 scrollbar-hide">
                {watchlistSignals.slice(0, 6).map((signal, index) => (
                  <SignalCard key={signal.signal_id} signal={signal} active={index === 0} compact />
                ))}
              </div>
            ) : (
              <EmptyState title="Empty stack" body="Configure watchlist in Settings." />
            )}
          </TerminalSurface>

          <TerminalSurface title="Execution" icon={ShieldCheck}>
            <div className="grid grid-cols-2 gap-2">
              <DataChip label="Wins" value={String(analytics?.wins ?? 0)} tone="border-success/20 bg-success-muted" />
              <DataChip label="Losses" value={String(analytics?.losses ?? 0)} tone="border-danger/20 bg-danger-muted" />
              <DataChip label="Avg RR" value={String(analytics?.avg_rr ?? 0)} />
              <DataChip label="Anchor" value={telegramTrade?.pair ?? "Idle"} />
            </div>
          </TerminalSurface>

          <TerminalSurface title="Learning" icon={BrainCircuit}>
            <div className="grid grid-cols-2 gap-2">
              <DataChip label="Closed" value={String(data?.learningStatus?.closed_trades_used ?? 0)} />
              <DataChip label="Net" value={String(data?.learningStatus?.net_outcome_score ?? 0)} />
              <DataChip label="Best Pair" value={data?.learningStatus?.strongest_pair ?? "N/A"} />
              <DataChip label="Best Setup" value={data?.learningStatus?.strongest_setup ?? "N/A"} />
            </div>
          </TerminalSurface>
        </div>
      </div>
    </TerminalShell>
  );
}
