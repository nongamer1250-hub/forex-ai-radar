"use client";

import { Radio, RefreshCw, TrendingUp } from "lucide-react";
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

  return (
    <TerminalShell
      title="Signals"
      subtitle="Use the live signal board as the primary execution workspace. The chart, watchlist, and trade context stay in sync."
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

      <div className="grid gap-4 2xl:grid-cols-[360px_minmax(0,1fr)_360px]">
        <TerminalSurface title="Watchlist Board" detail={`${signals.length} pairs`} icon={Radio}>
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

        <TerminalSurface title="Chart Surface" detail={activePair} icon={TrendingUp} className="overflow-hidden">
          <div className="grid gap-4">
            {activeSignal ? (
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-xl font-semibold text-white">{activeSignal.pair}</div>
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
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="mb-3 text-sm font-medium text-white">Setup Diagnostics</div>
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

            <TradingViewWidget symbol={activePair} />
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

          <TerminalSurface title="Telegram Anchor" icon={Radio}>
            {telegramTrade ? (
              <div className="rounded-2xl border border-cyan-300/18 bg-cyan-300/[0.08] p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
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
              <EmptyState title="No Telegram anchor yet" body="When the live engine pushes a trade to Telegram, it will be pinned here." />
            )}
          </TerminalSurface>
        </div>
      </div>
    </TerminalShell>
  );
}
