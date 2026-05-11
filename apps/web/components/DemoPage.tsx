"use client";

import { Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { SectionHeader, TerminalShell, formatNumber, panelClassName, signalTone, statusTone } from "@/components/terminal-ui";
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
    <TerminalShell title="Demo Trading" subtitle="Paper trade live signals with demo capital and automatic TP/SL settlement." preferences={data?.preferences}>
      <div className="grid gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className={`${panelClassName()} rounded-lg p-3`}>
          <SectionHeader title="Demo Wallet" icon={Wallet} />
          <div className="grid gap-2 font-mono text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Start Balance</span><strong>${formatNumber(account?.start_balance ?? 10000)}</strong></div>
            <div className="flex justify-between"><span className="text-slate-500">Balance</span><strong>${formatNumber(account?.balance ?? 10000)}</strong></div>
            <div className="flex justify-between"><span className="text-slate-500">Equity</span><strong>${formatNumber(account?.equity ?? 10000)}</strong></div>
            <div className="flex justify-between"><span className="text-slate-500">Open Positions</span><strong>{account?.open_positions ?? 0}</strong></div>
            <div className={`flex justify-between ${(account?.unrealized_pnl ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              <span className="text-slate-500">Unrealized</span>
              <strong>${formatNumber(account?.unrealized_pnl ?? 0)}</strong>
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-sm">
            <div>
              <label className="mb-2 block text-slate-500">Live signal source</label>
              <select
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2"
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

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-2 block text-slate-500">Pair</label>
                <select
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2"
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
                <label className="mb-2 block text-slate-500">Side</label>
                <select
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2"
                  onChange={(event) => setManualSignal(event.target.value as "BUY" | "SELL")}
                  value={manualSignal}
                >
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-slate-500">Demo units</label>
              <input
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2"
                min={100}
                onChange={(event) => setUnits(Number(event.target.value))}
                step={100}
                type="number"
                value={units}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-2 block text-slate-500">Entry</label>
                <input className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2" onChange={(event) => setManualEntry(Number(event.target.value))} type="number" value={manualEntry} />
              </div>
              <div>
                <label className="mb-2 block text-slate-500">SL</label>
                <input className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2" onChange={(event) => setManualSl(Number(event.target.value))} type="number" value={manualSl} />
              </div>
              <div>
                <label className="mb-2 block text-slate-500">TP</label>
                <input className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2" onChange={(event) => setManualTp(Number(event.target.value))} type="number" value={manualTp} />
              </div>
            </div>

            <button
              className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-60"
              disabled={isPending}
              onClick={() => {
                submitTrade({
                  pair: manualPair,
                  signal: manualSignal,
                  units,
                  entry: manualEntry,
                  sl: manualSl,
                  tp: manualTp,
                  rr: manualSignal === "BUY" ? Math.abs((manualTp - manualEntry) / Math.max(manualEntry - manualSl, 0.00001)) : Math.abs((manualEntry - manualTp) / Math.max(manualSl - manualEntry, 0.00001)),
                  source_signal_id: selectedSignal?.signal_id,
                });
              }}
              type="button"
            >
              Place demo trade
            </button>

            <button
              className="rounded-lg border border-rose-300/25 bg-rose-300/10 px-3 py-2 text-rose-100 transition hover:bg-rose-300/20 disabled:opacity-60"
              disabled={isPending}
              onClick={resetAccount}
              type="button"
            >
              Reset demo account
            </button>
          </div>
        </section>

        <section className={`${panelClassName()} overflow-hidden rounded-lg`}>
          <div className="border-b border-white/6 px-3 py-2.5">
            <SectionHeader title="Demo Orders" detail={`${trades.length} rows`} icon={Wallet} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-xs">
              <thead className="bg-white/[0.03] font-mono text-slate-500">
                <tr>
                  {["Pair", "Signal", "Units", "Entry", "SL", "TP", "Status", "Price", "PnL", "Opened"].map((header) => (
                    <th className="px-3 py-2 font-medium" key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => {
                  const pnl = trade.status === "OPEN" ? trade.unrealized_pnl ?? 0 : trade.realized_pnl ?? 0;
                  return (
                    <tr className="border-t border-white/6 text-slate-300" key={trade.demo_trade_id}>
                      <td className="px-3 py-2.5 font-mono text-white">{trade.pair}</td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-md border px-2 py-0.5 font-mono text-[11px] ${signalTone(trade.signal)}`}>{trade.signal}</span>
                      </td>
                      <td className="px-3 py-2.5 font-mono">{trade.units}</td>
                      <td className="px-3 py-2.5 font-mono">{trade.entry}</td>
                      <td className="px-3 py-2.5 font-mono text-rose-200">{trade.sl}</td>
                      <td className="px-3 py-2.5 font-mono text-emerald-200">{trade.tp}</td>
                      <td className={`px-3 py-2.5 font-mono ${statusTone(trade.status)}`}>{trade.status}</td>
                      <td className="px-3 py-2.5 font-mono">{trade.current_price ?? trade.close_price ?? "-"}</td>
                      <td className={`px-3 py-2.5 font-mono ${pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>${formatNumber(pnl)}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-500">{new Date(trade.opened_at).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </TerminalShell>
  );
}
