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
  const liveSignals = data?.signals.filter((s) => s.signal === "BUY" || s.signal === "SELL") ?? [];
  const [selectedSignalId, setSelectedSignalId] = useState("");
  const selectedSignal = useMemo(
    () => liveSignals.find((s) => s.signal_id === selectedSignalId) ?? liveSignals[0] ?? null,
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
    if (!preferences?.demo_auto_trade_enabled) return;
    void runAutoTrade();
  }, [preferences?.demo_auto_trade_enabled, data?.signals, runAutoTrade]);

  useEffect(() => {
    if (!selectedSignalId && liveSignals[0]) setSelectedSignalId(liveSignals[0].signal_id);
  }, [liveSignals, selectedSignalId]);

  useEffect(() => {
    if (!selectedSignal) return;
    setManualPair(selectedSignal.pair);
    setManualSignal(selectedSignal.signal === "SELL" ? "SELL" : "BUY");
    setManualEntry(selectedSignal.entry);
    setManualSl(selectedSignal.sl);
    setManualTp(selectedSignal.tp);
  }, [selectedSignal]);

  return (
    <TerminalShell
      title="Demo Trading"
      subtitle="Paper trading desk with auto-pilot and manual override."
      preferences={data?.preferences}
    >
      {/* Hero */}
      <MiniStatGrid>
        <HeroMetric label="Start Balance" value={`$${formatNumber(account?.start_balance ?? 10000)}`} footnote="Initial capital" />
        <HeroMetric label="Balance" value={`$${formatNumber(account?.balance ?? 10000)}`} footnote="After closed PnL" accent="success" />
        <HeroMetric label="Equity" value={`$${formatNumber(account?.equity ?? 10000)}`} footnote="Including open PnL" />
        <HeroMetric
          label="Unrealized PnL"
          value={`$${formatNumber(account?.unrealized_pnl ?? 0)}`}
          footnote={`${account?.open_positions ?? 0} open`}
          accent={(account?.unrealized_pnl ?? 0) >= 0 ? "success" : "danger"}
        />
      </MiniStatGrid>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Sidebar */}
        <div className="space-y-4">
          <TerminalSurface title="Auto Pilot" icon={Bot}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <DataChip label="Mode" value={preferences?.demo_auto_trade_enabled ? "AUTO" : "MANUAL"} />
                <DataChip label="Units" value={String(preferences?.demo_auto_trade_units ?? 10000)} />
              </div>
              <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
                {autoTradeStatus
                  ? `Last: ${autoTradeStatus.replaceAll("_", " ")}`
                  : "Enable auto demo in Settings to pick signals automatically."}
              </div>
              <button
                className="w-full rounded-lg border border-brand/30 bg-brand-muted px-4 py-2.5 text-sm font-medium text-brand transition-all hover:bg-brand/20 disabled:opacity-50"
                disabled={isPending}
                onClick={() => void runAutoTrade()}
                type="button"
              >
                Run auto now
              </button>
            </div>
          </TerminalSurface>

          <TerminalSurface title="Capital" icon={Wallet}>
            <div className="space-y-2.5">
              <DataChip label="Open" value={String(account?.open_positions ?? 0)} />
              <DataChip label="Realized" value={`$${formatNumber(account?.balance ?? 10000)}`} />
              <DataChip label="Equity" value={`$${formatNumber(account?.equity ?? 10000)}`} />
            </div>
          </TerminalSurface>
        </div>

        {/* Main */}
        <div className="space-y-4">
          <TerminalSurface title="Place Demo Trade" icon={Wallet}>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Use live signal</label>
                <select
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground"
                  onChange={(e) => setSelectedSignalId(e.target.value)}
                  value={selectedSignal?.signal_id ?? ""}
                >
                  {!liveSignals.length && <option value="">No live signals</option>}
                  {liveSignals.map((s) => (
                    <option key={s.signal_id} value={s.signal_id}>
                      {s.pair} | {s.signal} | {Math.round(s.confidence * 100)}%
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Pair</label>
                  <select
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground"
                    onChange={(e) => setManualPair(e.target.value)}
                    value={manualPair}
                  >
                    {STRATEGY_PAIRS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Side</label>
                  <select
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground"
                    onChange={(e) => setManualSignal(e.target.value as "BUY" | "SELL")}
                    value={manualSignal}
                  >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Units</label>
                <input
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground"
                  min={100}
                  onChange={(e) => setUnits(Number(e.target.value))}
                  step={100}
                  type="number"
                  value={units}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Entry</label>
                  <input
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground"
                    onChange={(e) => setManualEntry(Number(e.target.value))}
                    type="number"
                    value={manualEntry}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">SL</label>
                  <input
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground"
                    onChange={(e) => setManualSl(Number(e.target.value))}
                    type="number"
                    value={manualSl}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">TP</label>
                  <input
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground"
                    onChange={(e) => setManualTp(Number(e.target.value))}
                    type="number"
                    value={manualTp}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  className="btn-primary rounded-lg px-4 py-2.5 text-sm disabled:opacity-50"
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
                  Place trade
                </button>
                <button
                  className="rounded-lg border border-danger/30 bg-danger-muted px-4 py-2.5 text-sm font-medium text-danger disabled:opacity-50"
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
          <TerminalSurface title="Paper Ledger" detail={`${trades.length} entries`} icon={Wallet} noPadding>
            {trades.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="border-b border-border bg-secondary/30 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5">Pair</th>
                      <th className="px-4 py-2.5">Signal</th>
                      <th className="px-4 py-2.5">Units</th>
                      <th className="px-4 py-2.5">Entry</th>
                      <th className="px-4 py-2.5">SL</th>
                      <th className="px-4 py-2.5">TP</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Price</th>
                      <th className="px-4 py-2.5">PnL</th>
                      <th className="px-4 py-2.5">Opened</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {trades.map((t) => {
                      const pnl = t.status === "OPEN" ? t.unrealized_pnl ?? 0 : t.realized_pnl ?? 0;
                      return (
                        <tr key={t.demo_trade_id} className="transition-colors hover:bg-secondary/30">
                          <td className="px-4 py-3 font-mono font-semibold text-foreground">{t.pair}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${signalTone(t.signal)}`}>
                              {t.signal}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-foreground">{t.units}</td>
                          <td className="px-4 py-3 font-mono text-foreground">{t.entry}</td>
                          <td className="px-4 py-3 font-mono text-danger">{t.sl}</td>
                          <td className="px-4 py-3 font-mono text-success">{t.tp}</td>
                          <td className={`px-4 py-3 font-mono font-medium ${statusTone(t.status)}`}>{t.status}</td>
                          <td className="px-4 py-3 font-mono text-foreground">{t.current_price ?? t.close_price ?? "-"}</td>
                          <td className={`px-4 py-3 font-mono font-medium ${pnl >= 0 ? "text-success" : "text-danger"}`}>
                            ${formatNumber(pnl)}
                          </td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">{formatDateTime(t.opened_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4">
                <EmptyState title="No demo trades" body="Place a paper trade to start tracking." />
              </div>
            )}
          </TerminalSurface>
        </div>
      </div>
    </TerminalShell>
  );
}
