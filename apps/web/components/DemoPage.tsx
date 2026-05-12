"use client";

import { Bot, Wallet } from "lucide-react";
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
  const { account, trades, submitTrade, resetAccount, runAutoTrade, autoTradeStatus, isPending } = useDemoData();
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
  const preferences = data?.preferences;

  useEffect(() => {
    if (!preferences?.demo_auto_trade_enabled) {
      return;
    }
    void runAutoTrade();
  }, [preferences?.demo_auto_trade_enabled, data?.signals, runAutoTrade]);

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
      subtitle="Paper trading desk with auto-pilot capability and manual override controls."
      preferences={data?.preferences}
    >
      {/* Hero Metrics */}
      <MiniStatGrid>
        <HeroMetric label="Start Balance" value={`$${formatNumber(account?.start_balance ?? 10000)}`} footnote="Initial paper capital." />
        <HeroMetric label="Balance" value={`$${formatNumber(account?.balance ?? 10000)}`} footnote="After closed PnL." accent="emerald" />
        <HeroMetric label="Equity" value={`$${formatNumber(account?.equity ?? 10000)}`} footnote="Including open PnL." />
        <HeroMetric
          label="Unrealized PnL"
          value={`$${formatNumber(account?.unrealized_pnl ?? 0)}`}
          footnote={`${account?.open_positions ?? 0} open positions`}
          accent={(account?.unrealized_pnl ?? 0) >= 0 ? "emerald" : "rose"}
        />
      </MiniStatGrid>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        {/* Sidebar */}
        <div className="space-y-4">
          <TerminalSurface title="Auto Pilot" icon={Bot}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <DataChip label="Mode" value={preferences?.demo_auto_trade_enabled ? "AUTO" : "MANUAL"} />
                <DataChip label="Units" value={String(preferences?.demo_auto_trade_units ?? 10000)} />
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm leading-relaxed text-zinc-400">
                {autoTradeStatus
                  ? `Last action: ${autoTradeStatus.replaceAll("_", " ")}`
                  : "Enable auto demo in Settings to let the system pick signals automatically."}
              </div>
              <button
                className="w-full rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-400 transition-all hover:bg-cyan-500/20 disabled:opacity-50"
                disabled={isPending}
                onClick={() => void runAutoTrade()}
                type="button"
              >
                Run auto demo now
              </button>
            </div>
          </TerminalSurface>

          <TerminalSurface title="Capital Snapshot" icon={Wallet}>
            <div className="space-y-3">
              <DataChip label="Open Positions" value={String(account?.open_positions ?? 0)} />
              <DataChip label="Realized" value={`$${formatNumber(account?.balance ?? 10000)}`} />
              <DataChip label="Equity" value={`$${formatNumber(account?.equity ?? 10000)}`} />
            </div>
          </TerminalSurface>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          <TerminalSurface title="Place Demo Trade" icon={Wallet}>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-zinc-400">Use live signal</label>
                <select
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-100"
                  onChange={(event) => setSelectedSignalId(event.target.value)}
                  value={selectedSignal?.signal_id ?? ""}
                >
                  {!liveSignals.length && <option value="">No live signals</option>}
                  {liveSignals.map((signal) => (
                    <option key={signal.signal_id} value={signal.signal_id}>
                      {signal.pair} | {signal.signal} | {Math.round(signal.confidence * 100)}%
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Pair</label>
                  <select
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-100"
                    onChange={(event) => setManualPair(event.target.value)}
                    value={manualPair}
                  >
                    {STRATEGY_PAIRS.map((pair) => (
                      <option key={pair} value={pair}>{pair}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Side</label>
                  <select
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-100"
                    onChange={(event) => setManualSignal(event.target.value as "BUY" | "SELL")}
                    value={manualSignal}
                  >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-400">Units</label>
                <input
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-100"
                  min={100}
                  onChange={(event) => setUnits(Number(event.target.value))}
                  step={100}
                  type="number"
                  value={units}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Entry</label>
                  <input
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-100"
                    onChange={(event) => setManualEntry(Number(event.target.value))}
                    type="number"
                    value={manualEntry}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">SL</label>
                  <input
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-100"
                    onChange={(event) => setManualSl(Number(event.target.value))}
                    type="number"
                    value={manualSl}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">TP</label>
                  <input
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-100"
                    onChange={(event) => setManualTp(Number(event.target.value))}
                    type="number"
                    value={manualTp}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-3 text-sm font-semibold text-zinc-900 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
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
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-400 disabled:opacity-50"
                  disabled={isPending}
                  onClick={resetAccount}
                  type="button"
                >
                  Reset account
                </button>
              </div>
            </div>
          </TerminalSurface>

          {/* Trade Ledger */}
          <TerminalSurface title="Paper Trade Ledger" detail={`${trades.length} entries`} icon={Wallet} className="overflow-hidden">
            {trades.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-zinc-800 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="pb-3 pr-4">Pair</th>
                      <th className="pb-3 pr-4">Signal</th>
                      <th className="pb-3 pr-4">Units</th>
                      <th className="pb-3 pr-4">Entry</th>
                      <th className="pb-3 pr-4">SL</th>
                      <th className="pb-3 pr-4">TP</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4">Price</th>
                      <th className="pb-3 pr-4">PnL</th>
                      <th className="pb-3">Opened</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {trades.map((trade) => {
                      const pnl = trade.status === "OPEN" ? trade.unrealized_pnl ?? 0 : trade.realized_pnl ?? 0;
                      return (
                        <tr key={trade.demo_trade_id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="py-3 pr-4 font-mono font-medium text-zinc-100">{trade.pair}</td>
                          <td className="py-3 pr-4">
                            <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium ${signalTone(trade.signal)}`}>
                              {trade.signal}
                            </span>
                          </td>
                          <td className="py-3 pr-4 font-mono text-zinc-300">{trade.units}</td>
                          <td className="py-3 pr-4 font-mono text-zinc-300">{trade.entry}</td>
                          <td className="py-3 pr-4 font-mono text-rose-400">{trade.sl}</td>
                          <td className="py-3 pr-4 font-mono text-emerald-400">{trade.tp}</td>
                          <td className={`py-3 pr-4 font-mono ${statusTone(trade.status)}`}>{trade.status}</td>
                          <td className="py-3 pr-4 font-mono text-zinc-300">{trade.current_price ?? trade.close_price ?? "-"}</td>
                          <td className={`py-3 pr-4 font-mono ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            ${formatNumber(pnl)}
                          </td>
                          <td className="py-3 font-mono text-zinc-500">{formatDateTime(trade.opened_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No demo trades" body="Place a paper trade to start tracking." />
            )}
          </TerminalSurface>
        </div>
      </div>
    </TerminalShell>
  );
}
