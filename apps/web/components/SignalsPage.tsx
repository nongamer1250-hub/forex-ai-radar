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
      subtitle="Work from a cleaner execution board: select a pair, inspect the setup, and keep Telegram and recent trade context in the same workspace."
      preferences={preferences}
      actions={
        <>
          <MetricPill label="Visible Pairs" value={String(signals.length)} />
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
      {telegramTrade ? <StatusBanner role="telegram" pair={telegramTrade.pair} status={telegramTrade.trade_status} /> : null}

      <div className="grid gap-4 2xl:grid-cols-[320px_minmax(0,1fr)_340px]">
        <TerminalSurface title="Pair Matrix" detail={`${signals.length} pairs`} icon={Radio}>
          {signals.length ? (
            <div className="grid gap-3">
              {signals.map((signal) => (
                <SignalCard
                  active={activePair === signal.pair}
                  compact
                  key={signal.signal_id}
                  onClick={() => {
                    setSelectedPair(signal.pair);
                    savePreferences({ selected_pair: signal.pair });
                  }}
                  signal={signal}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No pairs on the board" body="Add pairs to your watchlist in Settings to populate the signal desk." />
          )}
        </TerminalSurface>

        <TerminalSurface title="Execution Workspace" detail={activePair} icon={TrendingUp} className="overflow-hidden">
          <div className="grid gap-4">
            {activeSignal ? (
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_0.85fr]">
                <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(135deg,rgba(9,18,30,0.96),rgba(5,10,18,0.98))] p-5">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-2xl font-semibold text-white">{activeSignal.pair}</div>
                      <div className="mt-1 text-sm text-slate-400">{activeSignal.setup_type ?? activeSignal.setup_quality}</div>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 font-mono text-[11px] ${signalTone(activeSignal.signal)}`}>{activeSignal.signal}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <DataChip label="Entry" value={String(activeSignal.entry)} />
                    <DataChip label="SL" value={String(activeSignal.sl)} tone="border-rose-300/16 bg-rose-300/8" />
                    <DataChip label="TP" value={String(activeSignal.tp)} tone="border-emerald-300/16 bg-emerald-300/8" />
                    <DataChip label="RR" value={String(activeSignal.rr)} />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <DataChip label="Trade State" value={activeSignal.trade_status} />
                    <DataChip label="Trend" value={activeSignal.trend_bias} />
                    <DataChip label="Session" value={activeSignal.session} />
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                    <Sparkles size={15} className="text-cyan-300" />
                    Setup Diagnostics
                  </div>
                  <ConfidenceMeter value={activeSignal.confidence} />
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <DataChip label="Score" value={String(activeSignal.setup_score)} />
                    <DataChip label="RSI" value={String(activeSignal.rsi)} />
                    <DataChip label="Trend" value={activeSignal.trend_bias} />
                    <DataChip label="Status" value={activeSignal.trade_status} tone={activeSignal.trade_status === "OPEN" ? "border-cyan-300/16 bg-cyan-300/8" : "border-white/8 bg-white/[0.03]"} />
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState title="No active signal selected" body="The chart will follow the pair you choose from the watchlist board." />
            )}

            <div className="overflow-hidden rounded-[26px] border border-white/8 bg-[#050a11] p-2 shadow-[0_22px_50px_rgba(2,6,23,0.28)]">
              <TradingViewWidget symbol={activePair} />
            </div>

            {activeSignal ? (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5">
                  <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
                    <BarChart3 size={15} className="text-cyan-300" />
                    Signal Context
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <DataChip label="Candle Strength" value={String(activeSignal.candle_strength)} />
                    <DataChip label="ATR" value={String(activeSignal.atr)} />
                    <DataChip label="Learning Bias" value={String(activeSignal.learning_bias ?? 0)} />
                    <DataChip label="Source" value={activeSignal.source} />
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
                  <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">Telegram anchor</div>
                  {telegramTrade ? (
                    <div className="grid gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-mono text-lg font-semibold text-white">{telegramTrade.pair}</div>
                          <div className="text-sm text-slate-400">
                            {data?.activeTelegramTrade ? "Current locked Telegram trade" : "Last pushed Telegram trade"}
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
                    <EmptyState title="No Telegram anchor yet" body="When the engine pushes a trade to Telegram, it will be pinned here." />
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </TerminalSurface>

        <div className="grid content-start gap-4">
          <TerminalSurface title="Execution Details" icon={Radio}>
            {activeSignal ? (
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <DataChip label="Session" value={activeSignal.session} />
                  <DataChip label="Candle Strength" value={String(activeSignal.candle_strength)} />
                  <DataChip label="ATR" value={String(activeSignal.atr)} />
                  <DataChip label="Learning Bias" value={String(activeSignal.learning_bias ?? 0)} />
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">Trade State</div>
                  <div className={`font-mono text-sm ${statusTone(activeSignal.trade_status)}`}>{activeSignal.trade_status}</div>
                </div>
              </div>
            ) : (
              <EmptyState title="Nothing to inspect" body="Once a signal is selected, its setup data and risk model appear here." />
            )}
          </TerminalSurface>

          <TerminalSurface title="Pair Trade Trail" icon={BarChart3}>
            {backlog.length ? (
              <div className="grid gap-3">
                {backlog.map((trade) => (
                  <div className="rounded-[20px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))] p-4" key={trade.signal_id}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-sm font-semibold text-white">{trade.pair}</div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">{trade.setup_type ?? trade.setup_quality}</div>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 font-mono text-[11px] ${signalTone(trade.signal)}`}>{trade.signal}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <DataChip label="RR" value={String(trade.rr)} />
                      <DataChip label="Status" value={trade.trade_status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No recent trail for this pair" body="Resolved or open trades for the selected pair will collect here." />
            )}
          </TerminalSurface>
        </div>
      </div>
    </TerminalShell>
  );
}
