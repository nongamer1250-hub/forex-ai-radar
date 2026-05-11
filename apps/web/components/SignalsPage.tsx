"use client";

import { Radio, RefreshCw, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import { TradingViewWidget } from "@/components/TradingViewWidget";
import { ConfidenceMeter, MetricPill, SectionHeader, TerminalShell, formatSignalTime, panelClassName, signalTone, statusTone } from "@/components/terminal-ui";
import { useAuth } from "@/components/use-auth";
import { useDashboardData } from "@/components/use-live-data";

export function SignalsPage() {
  const { session } = useAuth();
  const { data, forceScanNow, isPending, savePreferences } = useDashboardData();
  const [selectedPair, setSelectedPair] = useState("EURUSD");
  const preferences = data?.preferences;
  const signals = (data?.signals ?? []).filter((signal) => (preferences?.watchlist.length ? preferences.watchlist.includes(signal.pair) : true));
  useEffect(() => {
    if (preferences?.selected_pair) {
      setSelectedPair(preferences.selected_pair);
    }
  }, [preferences?.selected_pair]);
  const activePair = signals.some((item) => item.pair === selectedPair) ? selectedPair : signals[0]?.pair ?? "EURUSD";
  const activeSignal = signals.find((item) => item.pair === activePair);

  return (
    <TerminalShell
      title="Signals"
      subtitle="Signal routing, live chart context, and Telegram anchor trades."
      preferences={preferences}
      actions={
        <>
          <MetricPill label="Session" value={activeSignal?.session ?? "Offline"} />
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
      <div className="grid gap-3 2xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <section className={`${panelClassName()} overflow-hidden rounded-lg`}>
          <div className="flex items-center justify-between border-b border-white/6 px-3 py-2.5">
            <SectionHeader title="TradingView Surface" detail={activePair} icon={TrendingUp} />
            <MetricPill label="Setup" value={activeSignal?.setup_type ?? "NONE"} />
          </div>
          <TradingViewWidget symbol={activePair} />
        </section>

        <aside className="grid content-start gap-3">
          <section className={`${panelClassName()} rounded-lg p-3`}>
            <SectionHeader title="Telegram Anchor" icon={Radio} />
            {data?.activeTelegramTrade || data?.latestTelegramTrade ? (
              <div className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 p-3">
                <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-cyan-100">
                  {data?.activeTelegramTrade ? "Active trade" : "Last pushed trade"}
                </div>
                <div className="flex items-center justify-between font-mono text-sm">
                  <strong>{(data?.activeTelegramTrade ?? data?.latestTelegramTrade)?.pair}</strong>
                  <span className={statusTone((data?.activeTelegramTrade ?? data?.latestTelegramTrade)?.trade_status ?? "WAIT")}>
                    {(data?.activeTelegramTrade ?? data?.latestTelegramTrade)?.signal} / {(data?.activeTelegramTrade ?? data?.latestTelegramTrade)?.trade_status}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No Telegram trade has been pushed yet.</p>
            )}
          </section>

          <section className={`${panelClassName()} rounded-lg p-3`}>
            <SectionHeader title="Watchlist" detail={`${signals.length} pairs`} icon={Radio} />
            <div className="grid gap-2">
              {signals.map((signal) => (
                <button
                  className={`rounded-lg border px-3 py-2.5 text-left transition ${activePair === signal.pair ? "border-cyan-300/35 bg-cyan-300/10" : "border-white/8 bg-white/[0.03] hover:border-white/15"}`}
                  key={signal.signal_id}
                  onClick={() => {
                    setSelectedPair(signal.pair);
                    savePreferences({ selected_pair: signal.pair });
                  }}
                  type="button"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <strong className="font-mono text-sm text-white">{signal.pair}</strong>
                    <span className={`rounded-md border px-2 py-0.5 text-[11px] ${signalTone(signal.signal)}`}>{signal.signal}</span>
                  </div>
                  <div className="mb-2 flex items-center justify-between font-mono text-[11px] text-slate-400">
                    <span>{signal.trade_status}</span>
                    <span>{formatSignalTime(signal.timestamp)}</span>
                  </div>
                  <ConfidenceMeter value={signal.confidence} />
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </TerminalShell>
  );
}
