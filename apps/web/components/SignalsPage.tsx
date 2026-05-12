"use client";

import { Activity, BarChart3, Radio, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import { TradingViewWidget } from "@/components/TradingViewWidget";
import {
  ConfidenceMeter,
  DataChip,
  EmptyState,
  MetricPill,
  SignalCard,
  StatusBanner,
  TerminalShell,
  TerminalSurface,
  signalTone,
  statusTone,
} from "@/components/terminal-ui";
import { useAuth } from "@/components/use-auth";
import { useDashboardData } from "@/components/use-live-data";

export function SignalsPage() {
  const { session } = useAuth();
  const { data, forceScanNow, isPending, savePreferences } = useDashboardData();
  const [selectedPair, setSelectedPair] = useState("EURUSD");
  const preferences = data?.preferences;
  const signals = (data?.signals ?? []).filter((signal) =>
    preferences?.watchlist.length ? preferences.watchlist.includes(signal.pair) : true,
  );

  useEffect(() => {
    if (preferences?.selected_pair) {
      setSelectedPair(preferences.selected_pair);
    }
  }, [preferences?.selected_pair]);

  const activePair = signals.some((item) => item.pair === selectedPair) ? selectedPair : signals[0]?.pair ?? "EURUSD";
  const activeSignal = signals.find((item) => item.pair === activePair) ?? null;
  const telegramTrade = data?.activeTelegramTrade ?? data?.latestTelegramTrade ?? null;
  const backlog = data?.trades?.filter((trade) => trade.pair === activePair).slice(0, 4) ?? [];

  return (
    <TerminalShell
      title="Signals"
      subtitle="Select a pair, inspect setup details, and monitor execution context."
      preferences={preferences}
      actions={
        <>
          <MetricPill label="Active" value={String(signals.length)} />
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
      {telegramTrade && (
        <StatusBanner role="telegram" pair={telegramTrade.pair} status={telegramTrade.trade_status} />
      )}

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_280px]">
        {/* Pair Matrix */}
        <TerminalSurface title="Pair Matrix" detail={`${signals.length}`} icon={Radio}>
          {signals.length ? (
            <div className="max-h-[calc(100vh-280px)] space-y-2.5 overflow-y-auto pr-1 scrollbar-hide">
              {signals.map((signal) => (
                <SignalCard
                  key={signal.signal_id}
                  signal={signal}
                  active={activePair === signal.pair}
                  compact
                  onClick={() => {
                    setSelectedPair(signal.pair);
                    savePreferences({ selected_pair: signal.pair });
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No pairs" body="Configure watchlist in Settings." />
          )}
        </TerminalSurface>

        {/* Execution Workspace */}
        <TerminalSurface title="Workspace" detail={activePair} icon={TrendingUp}>
          <div className="space-y-4">
            {activeSignal ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Signal Info */}
                <div className="min-w-0 rounded-lg border border-border bg-secondary/30 p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="font-mono text-xl font-bold text-foreground">{activeSignal.pair}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{activeSignal.setup_type ?? activeSignal.setup_quality}</div>
                    </div>
                    <span className={`rounded border px-2 py-0.5 font-mono text-xs font-semibold ${signalTone(activeSignal.signal)}`}>
                      {activeSignal.signal}
                    </span>
                  </div>
                  <div className="grid min-w-0 grid-cols-2 gap-2 xl:grid-cols-4">
                    <DataChip label="Entry" value={String(activeSignal.entry)} />
                    <DataChip label="SL" value={String(activeSignal.sl)} tone="border-danger/20 bg-danger-muted" />
                    <DataChip label="TP" value={String(activeSignal.tp)} tone="border-success/20 bg-success-muted" />
                    <DataChip label="RR" value={String(activeSignal.rr)} />
                  </div>
                  <div className="mt-2 grid min-w-0 grid-cols-2 gap-2 2xl:grid-cols-3">
                    <DataChip label="State" value={activeSignal.trade_status} />
                    <DataChip label="Trend" value={activeSignal.trend_bias} />
                    <DataChip label="Session" value={activeSignal.session} />
                  </div>
                </div>

                {/* Diagnostics */}
                <div className="min-w-0 rounded-lg border border-border bg-secondary/30 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Sparkles size={14} className="text-brand" />
                    Diagnostics
                  </div>
                  <ConfidenceMeter value={activeSignal.confidence} />
                  <div className="mt-3 grid min-w-0 grid-cols-2 gap-2">
                    <DataChip label="Score" value={String(activeSignal.setup_score)} />
                    <DataChip label="RSI" value={String(activeSignal.rsi)} />
                    <DataChip label="Trend" value={activeSignal.trend_bias} />
                    <DataChip 
                      label="Status" 
                      value={activeSignal.trade_status} 
                      tone={activeSignal.trade_status === "OPEN" ? "border-brand/20 bg-brand-muted" : undefined}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState title="No signal" body="Select a pair from the matrix." />
            )}

            {/* Chart */}
            <div className="overflow-hidden rounded-lg border border-border">
              <TradingViewWidget symbol={activePair} />
            </div>

            {/* Context + Telegram */}
            {activeSignal && (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="min-w-0 rounded-lg border border-border bg-secondary/30 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <BarChart3 size={14} className="text-brand" />
                    Context
                  </div>
                  <div className="grid min-w-0 grid-cols-2 gap-2 xl:grid-cols-4">
                    <DataChip label="Candle" value={String(activeSignal.candle_strength)} />
                    <DataChip label="ATR" value={String(activeSignal.atr)} />
                    <DataChip label="Bias" value={String(activeSignal.learning_bias ?? 0)} />
                    <DataChip label="Source" value={activeSignal.source} />
                  </div>
                </div>

                <div className="min-w-0 rounded-lg border border-border bg-card p-4">
                  <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Telegram Anchor</div>
                  {telegramTrade ? (
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="font-mono text-base font-bold text-foreground">{telegramTrade.pair}</div>
                          <div className="text-xs text-muted-foreground">
                            {data?.activeTelegramTrade ? "Active" : "Last pushed"}
                          </div>
                        </div>
                        <span className={`font-mono text-sm font-medium ${statusTone(telegramTrade.trade_status)}`}>
                          {telegramTrade.signal} / {telegramTrade.trade_status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <DataChip label="Entry" value={String(telegramTrade.entry)} />
                        <DataChip label="SL" value={String(telegramTrade.sl)} />
                        <DataChip label="TP" value={String(telegramTrade.tp)} />
                      </div>
                    </div>
                  ) : (
                    <EmptyState title="No anchor" body="Telegram trade will appear here." />
                  )}
                </div>
              </div>
            )}
          </div>
        </TerminalSurface>

        {/* Sidebar */}
        <div className="space-y-4">
          <TerminalSurface title="Execution" icon={Activity}>
            {activeSignal ? (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <DataChip label="Session" value={activeSignal.session} />
                  <DataChip label="Candle" value={String(activeSignal.candle_strength)} />
                  <DataChip label="ATR" value={String(activeSignal.atr)} />
                  <DataChip label="Bias" value={String(activeSignal.learning_bias ?? 0)} />
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">State</div>
                  <div className={`font-mono text-sm font-semibold ${statusTone(activeSignal.trade_status)}`}>
                    {activeSignal.trade_status}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState title="Nothing selected" body="Select a signal." />
            )}
          </TerminalSurface>

          <TerminalSurface title="Pair History" icon={BarChart3}>
            {backlog.length ? (
              <div className="space-y-2.5">
                {backlog.map((trade) => (
                  <div key={trade.signal_id} className="rounded-lg border border-border bg-secondary/30 p-3">
                    <div className="mb-2 flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="font-mono text-sm font-bold text-foreground">{trade.pair}</div>
                        <div className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                          {trade.setup_type ?? trade.setup_quality}
                        </div>
                      </div>
                      <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${signalTone(trade.signal)}`}>
                        {trade.signal}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <DataChip label="RR" value={String(trade.rr)} />
                      <DataChip label="Status" value={trade.trade_status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No history" body="Past trades appear here." />
            )}
          </TerminalSurface>
        </div>
      </div>
    </TerminalShell>
  );
}
