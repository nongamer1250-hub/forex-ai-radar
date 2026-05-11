"use client";

import { Activity, BarChart3, BrainCircuit, Trophy } from "lucide-react";

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
import { useDashboardData } from "@/components/use-live-data";

export function AnalyticsPage() {
  const { data } = useDashboardData();
  const trades = data?.trades ?? [];
  const pairPerformance = data?.pairPerformance;
  const analytics = data?.analytics;

  return (
    <TerminalShell
      title="Analytics"
      subtitle="Review system performance, pair quality, and the historical trade ledger through a denser analytical surface."
      preferences={data?.preferences}
    >
      <MiniStatGrid>
        <HeroMetric label="Wins" value={String(analytics?.wins ?? 0)} footnote="Resolved take-profit outcomes." accent="emerald" />
        <HeroMetric label="Losses" value={String(analytics?.losses ?? 0)} footnote="Resolved stop-loss outcomes." accent="rose" />
        <HeroMetric label="Average RR" value={formatNumber(analytics?.avg_rr ?? 0)} footnote="Average risk-reward across tracked trades." />
        <HeroMetric label="Best Pair" value={analytics?.best_pair ?? "N/A"} footnote="Highest current edge based on recorded outcomes." accent="amber" />
      </MiniStatGrid>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.3fr)_420px]">
        <div className="grid gap-4">
          <TerminalSurface title="Trade Ledger" detail={`${trades.length} rows`} icon={Activity} className="overflow-hidden">
            {trades.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="border-b border-white/6 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      {["Pair", "Signal", "Setup", "Entry", "SL", "TP", "RR", "Status", "Opened"].map((header) => (
                        <th className="px-0 py-3 first:pr-4 last:pl-4" key={header}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade) => (
                      <tr className="border-b border-white/6 last:border-b-0" key={trade.signal_id}>
                        <td className="py-3 pr-4 font-mono text-white">{trade.pair}</td>
                        <td className="py-3">
                          <span className={`rounded-full border px-2.5 py-1 font-mono text-[11px] ${signalTone(trade.signal)}`}>{trade.signal}</span>
                        </td>
                        <td className="py-3 text-slate-300">{trade.setup_type ?? trade.setup_quality}</td>
                        <td className="py-3 font-mono text-slate-200">{trade.entry}</td>
                        <td className="py-3 font-mono text-rose-200">{trade.sl}</td>
                        <td className="py-3 font-mono text-emerald-200">{trade.tp}</td>
                        <td className="py-3 font-mono text-slate-200">{trade.rr}</td>
                        <td className={`py-3 font-mono ${statusTone(trade.trade_status)}`}>{trade.trade_status}</td>
                        <td className="py-3 pl-4 font-mono text-slate-500">{formatDateTime(trade.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No trades recorded yet" body="As the live engine opens and resolves trades, the ledger will populate here." />
            )}
          </TerminalSurface>

          <TerminalSurface title="Pair Performance Matrix" detail={`${pairPerformance?.pairs.length ?? 0} pairs`} icon={BarChart3} className="overflow-hidden">
            {pairPerformance?.pairs.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead className="border-b border-white/6 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      {["Pair", "State", "Finished", "Win Rate", "Wins", "Losses", "Avg Bias", "Avg Confidence"].map((header) => (
                        <th className="px-0 py-3 first:pr-4 last:pl-4" key={header}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pairPerformance.pairs.map((row) => (
                      <tr className="border-b border-white/6 last:border-b-0" key={row.pair}>
                        <td className="py-3 pr-4 font-mono text-white">{row.pair}</td>
                        <td className={`py-3 font-mono ${row.enabled ? "text-emerald-300" : "text-slate-500"}`}>{row.enabled ? "ON" : "OFF"}</td>
                        <td className="py-3 font-mono text-slate-200">{row.finished_trades}</td>
                        <td className="py-3 font-mono text-slate-200">{row.win_rate}%</td>
                        <td className="py-3 font-mono text-emerald-300">{row.wins}</td>
                        <td className="py-3 font-mono text-rose-300">{row.losses}</td>
                        <td className={`py-3 font-mono ${row.avg_learning_bias >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{row.avg_learning_bias}</td>
                        <td className="py-3 pl-4 font-mono text-slate-200">{Math.round(row.avg_confidence * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No pair analytics yet" body="The optimizer starts showing pair-level diagnostics once it has enough logged samples." />
            )}
          </TerminalSurface>
        </div>

        <div className="grid content-start gap-4">
          <TerminalSurface title="Live Learning Status" icon={BrainCircuit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <DataChip label="Closed Trades Used" value={String(data?.learningStatus?.closed_trades_used ?? 0)} />
              <DataChip label="Net Outcome Score" value={String(data?.learningStatus?.net_outcome_score ?? 0)} />
              <DataChip label="Strongest Pair" value={data?.learningStatus?.strongest_pair ?? "N/A"} />
              <DataChip label="Strongest Setup" value={data?.learningStatus?.strongest_setup ?? "N/A"} />
            </div>
          </TerminalSurface>

          <TerminalSurface title="Optimizer State" icon={Trophy}>
            <div className="grid gap-3">
              <DataChip label="Auto Blocked Pairs" value={data?.optimizer?.auto_blocked_pairs.join(", ") || "None"} />
              <DataChip label="Recommended On" value={String(data?.optimizer?.recommended_enabled_pairs.length ?? 0)} />
              <DataChip label="Recommended Off" value={String(data?.optimizer?.recommended_disabled_pairs.length ?? 0)} />
            </div>
          </TerminalSurface>
        </div>
      </div>
    </TerminalShell>
  );
}
