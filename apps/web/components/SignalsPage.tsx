"use client";

import { BarChart3, Radio, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
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
      subtitle="Select a pair, inspect the setup details, and monitor live execution context."
      preferences={preferences}
      actions={
        <>
          <MetricPill label="Active Pairs" value={String(signals.length)} />
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
      {telegramTrade && (
        <StatusBanner role="telegram" pair={telegramTrade.pair} status={telegramTrade.trade_status} />
      )}

      <div className="grid gap-4 2xl:grid-cols-[300px_1fr_320px]">
        {/* Pair Matrix */}
        <TerminalSurface title="Pair Matrix" detail={`${signals.length} pairs`} icon={Radio}>
          {signals.length ? (
            <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
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
            <EmptyState title="No pairs available" body="Configure your watchlist in Settings." />
          )}
        </TerminalSurface>

        {/* Execution Workspace */}
        <TerminalSurface title="Execution Workspace" detail={activePair} icon={TrendingUp} className="overflow-hidden">
          <div className="space-y-4">
            {activeSignal ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {/* Signal Info */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-5">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <div className="font-mono text-2xl font-bold text-zinc-50">{activeSignal.pair}</div>
                      <div className="mt-1 text-sm text-zinc-500">{activeSignal.setup_type ?? activeSignal.setup_quality}</div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 font-mono text-xs font-medium ${signalTone(activeSignal.signal)}`}>
                      {activeSignal.signal}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <DataChip label="Entry" value={String(activeSignal.entry)} />
                    <DataChip label="SL" value={String(activeSignal.sl)} tone="border-rose-500/20 bg-rose-500/5" />
                    <DataChip label="TP" value={String(activeSignal.tp)} tone="border-emerald-500/20 bg-emerald-500/5" />
                    <DataChip label="RR" value={String(activeSignal.rr)} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <DataChip label="State" value={activeSignal.trade_status} />
                    <DataChip label="Trend" value={activeSignal.trend_bias} />
                    <DataChip label="Session" value={activeSignal.session} />
                  </div>
                </div>

                {/* Diagnostics */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-5">
                  <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-200">
                    <Sparkles size={16} className="text-cyan-400" />
                    Setup Diagnostics
                  </div>
                  <ConfidenceMeter value={activeSignal.confidence} />
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <DataChip label="Score" value={String(activeSignal.setup_score)} />
                    <DataChip label="RSI" value={String(activeSignal.rsi)} />
                    <DataChip label="Trend" value={activeSignal.trend_bias} />
                    <DataChip 
                      label="Status" 
                      value={activeSignal.trade_status} 
                      tone={activeSignal.trade_status === "OPEN" ? "border-cyan-500/20 bg-cyan-500/5" : undefined}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState title="No signal selected" body="Choose a pair from the matrix to view details." />
            )}

            {/* Chart */}
            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-1">
              <TradingViewWidget symbol={activePair} />
            </div>

            {/* Context & Telegram */}
            {activeSignal && (
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-5">
                  <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-200">
                    <BarChart3 size={16} className="text-cyan-400" />
                    Signal Context
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <DataChip label="Candle" value={String(activeSignal.candle_strength)} />
                    <DataChip label="ATR" value={String(activeSignal.atr)} />
                    <DataChip label="Bias" value={String(activeSignal.learning_bias ?? 0)} />
                    <DataChip label="Source" value={activeSignal.source} />
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <div className="mb-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Telegram Anchor</div>
                  {telegramTrade ? (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-mono text-lg font-semibold text-zinc-100">{telegramTrade.pair}</div>
                          <div className="text-sm text-zinc-500">
                            {data?.activeTelegramTrade ? "Active trade" : "Last pushed"}
                          </div>
                        </div>
                        <span className={`font-mono text-sm ${statusTone(telegramTrade.trade_status)}`}>
                          {telegramTrade.signal} / {telegramTrade.trade_status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <DataChip label="Entry" value={String(telegramTrade.entry)} />
                        <DataChip label="SL" value={String(telegramTrade.sl)} />
                        <DataChip label="TP" value={String(telegramTrade.tp)} />
                      </div>
                    </div>
                  ) : (
                    <EmptyState title="No Telegram anchor" body="Trade pushed to Telegram will appear here." />
                  )}
                </div>
              </div>
            )}
          </div>
        </TerminalSurface>

        {/* Sidebar */}
        <div className="space-y-4">
          <TerminalSurface title="Execution Details" icon={Radio}>
            {activeSignal ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <DataChip label="Session" value={activeSignal.session} />
                  <DataChip label="Candle" value={String(activeSignal.candle_strength)} />
                  <DataChip label="ATR" value={String(activeSignal.atr)} />
                  <DataChip label="Bias" value={String(activeSignal.learning_bias ?? 0)} />
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Trade State</div>
                  <div className={`font-mono text-sm ${statusTone(activeSignal.trade_status)}`}>
                    {activeSignal.trade_status}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState title="Nothing selected" body="Select a signal to view execution details." />
            )}
          </TerminalSurface>

          <TerminalSurface title="Pair History" icon={BarChart3}>
            {backlog.length ? (
              <div className="space-y-3">
                {backlog.map((trade) => (
                  <div key={trade.signal_id} className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <div className="font-mono text-sm font-semibold text-zinc-100">{trade.pair}</div>
                        <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                          {trade.setup_type ?? trade.setup_quality}
                        </div>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium ${signalTone(trade.signal)}`}>
                        {trade.signal}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <DataChip label="RR" value={String(trade.rr)} />
                      <DataChip label="Status" value={trade.trade_status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No history" body="Past trades for this pair will appear here." />
            )}
          </TerminalSurface>
        </div>
      </div>
    </TerminalShell>
  );
}
