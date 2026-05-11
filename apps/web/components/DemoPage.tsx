"use client";

import { Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  DataChip,
  EmptyState,
  HeroMetric,
  MiniStatGrid,
  TerminalShell,
  TerminalSurface,
  formatDateTime,
  formatNumber,
  signalTone,
  statusTone,
} from "@/components/terminal-ui";
import { useDashboardData, useDemoData } from "@/components/use-live-data";
import { STRATEGY_PAIRS } from "@/lib/constants";

export function DemoPage() {
  const { data } = useDashboardData();
  const { account, trades, submitTrade, resetAccount, isPending } = useDemoData();
  const liveSignals = data?.signals.filter((item) => item.signal === "BUY" || item.signal === "SELL") ?? [];
  const [selectedSignalId, setSelectedSignalId] = useState("");
  const selectedSignal = useMemo(
    () => liveSignals.find((signal) => signal.signal_id === selectedSignalId) ?? liveSignals[0] ?? null,
    [liveSignals, selectedSignalId],
  );
  const [units, setUnits] = useState(10000);
  const [manualPair, setManualPair] = useState("EURUSD");
  const [manualSignal, setManualSignal] = useState<"BUY" | "SELL">("BUY");
  const [manualEntry, setManualEntry] = useState(1.1);
  const [manualSl, setManualSl] = useState(1.095);
  const [manualTp, setManualTp] = useState(1.11);

  useEffect(() => {
    if (!selectedSignalId && liveSignals[0]) {
      setSelectedSignalId(liveSignals[0].signal_id);
    }
  }, [liveSignals, selectedSignalId]);

  useEffect(() => {
    if (!selectedSignal) {
      return;
    }
    setManualPair(selectedSignal.pair);
    setManualSignal(selectedSignal.signal === "SELL" ? "SELL" : "BUY");
    setManualEntry(selectedSignal.entry);
    setManualSl(selectedSignal.sl);
    setManualTp(selectedSignal.tp);
  }, [selectedSignal]);

  return (
    <TerminalShell
      title="Demo Trading"
      subtitle="Run paper trades against the live signal engine without touching real capital. Balance, equity, and settlement update automatically."
      preferences={data?.preferences}
    >
      <MiniStatGrid>
        <HeroMetric label="Start Balance" value={`$${formatNumber(account?.start_balance ?? 10000)}`} footnote="Initial paper capital." />
        <HeroMetric label="Balance" value={`$${formatNumber(account?.balance ?? 10000)}`} footnote="Closed PnL applied." accent="emerald" />
        <HeroMetric label="Equity" value={`$${formatNumber(account?.equity ?? 10000)}`} footnote="Balance plus open PnL." />
        <HeroMetric
          label="Unrealized PnL"
          value={`$${formatNumber(account?.unrealized_pnl ?? 0)}`}
          footnote={`${account?.open_positions ?? 0} open positions`}
          accent={(account?.unrealized_pnl ?? 0) >= 0 ? "emerald" : "rose"}
        />
      </MiniStatGrid>

      <div className="grid gap-4 2xl:grid-cols-[420px_minmax(0,1fr)]">
        <TerminalSurface title="Place Demo Trade" icon={Wallet}>
          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm text-slate-400">Use live signal</label>
              <select
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm"
                onChange={(event) => setSelectedSignalId(event.target.value)}
                value={selectedSignal?.signal_id ?? ""}
              >
                {!liveSignals.length ? <option value="">No live BUY/SELL signals</option> : null}
                {liveSignals.map((signal) => (
                  <option key={signal.signal_id} value={signal.signal_id}>
                    {signal.pair} | {signal.signal} | {Math.round(signal.confidence * 100)}%
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-400">Pair</label>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm"
                  onChange={(event) => setManualPair(event.target.value)}
                  value={manualPair}
                >
                  {STRATEGY_PAIRS.map((pair) => (
                    <option key={pair} value={pair}>
                      {pair}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-400">Side</label>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm"
                  onChange={(event) => setManualSignal(event.target.value as "BUY" | "SELL")}
                  value={manualSignal}
                >
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Units</label>
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm"
                min={100}
                onChange={(event) => setUnits(Number(event.target.value))}
                step={100}
                type="number"
                value={units}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm text-slate-400">Entry</label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm"
                  onChange={(event) => setManualEntry(Number(event.target.value))}
                  type="number"
                  value={manualEntry}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-400">SL</label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm"
                  onChange={(event) => setManualSl(Number(event.target.value))}
                  type="number"
                  value={manualSl}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-400">TP</label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm"
                  onChange={(event) => setManualTp(Number(event.target.value))}
                  type="number"
                  value={manualTp}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                className="rounded-2xl border border-cyan-300/25 bg-cyan-300/12 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-60"
                disabled={isPending}
                onClick={() => {
                  submitTrade({
                    pair: manualPair,
                    signal: manualSignal,
                    units,
                    entry: manualEntry,
                    sl: manualSl,
                    tp: manualTp,
                    rr:
                      manualSignal === "BUY"
                        ? Math.abs((manualTp - manualEntry) / Math.max(manualEntry - manualSl, 0.00001))
                        : Math.abs((manualEntry - manualTp) / Math.max(manualSl - manualEntry, 0.00001)),
                    source_signal_id: selectedSignal?.signal_id,
                  });
                }}
                type="button"
              >
                Place demo trade
              </button>

              <button
                className="rounded-2xl border border-rose-300/25 bg-rose-300/12 px-4 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-300/20 disabled:opacity-60"
                disabled={isPending}
                onClick={resetAccount}
                type="button"
              >
                Reset demo account
              </button>
            </div>
          </div>
        </TerminalSurface>

        <TerminalSurface title="Paper Trade Ledger" detail={`${trades.length} rows`} icon={Wallet} className="overflow-hidden">
          {trades.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-white/6 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    {["Pair", "Signal", "Units", "Entry", "SL", "TP", "Status", "Price", "PnL", "Opened"].map((header) => (
                      <th className="px-0 py-3 first:pr-4 last:pl-4" key={header}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => {
                    const pnl = trade.status === "OPEN" ? trade.unrealized_pnl ?? 0 : trade.realized_pnl ?? 0;
                    return (
                      <tr className="border-b border-white/6 last:border-b-0" key={trade.demo_trade_id}>
                        <td className="py-3 pr-4 font-mono text-white">{trade.pair}</td>
                        <td className="py-3">
                          <span className={`rounded-full border px-2.5 py-1 font-mono text-[11px] ${signalTone(trade.signal)}`}>{trade.signal}</span>
                        </td>
                        <td className="py-3 font-mono text-slate-200">{trade.units}</td>
                        <td className="py-3 font-mono text-slate-200">{trade.entry}</td>
                        <td className="py-3 font-mono text-rose-200">{trade.sl}</td>
                        <td className="py-3 font-mono text-emerald-200">{trade.tp}</td>
                        <td className={`py-3 font-mono ${statusTone(trade.status)}`}>{trade.status}</td>
                        <td className="py-3 font-mono text-slate-200">{trade.current_price ?? trade.close_price ?? "-"}</td>
                        <td className={`py-3 font-mono ${pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>${formatNumber(pnl)}</td>
                        <td className="py-3 pl-4 font-mono text-slate-500">{formatDateTime(trade.opened_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No demo trades yet" body="Create a paper trade from a live signal or enter one manually to start tracking performance." />
          )}
        </TerminalSurface>
      </div>
    </TerminalShell>
  );
}
