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
      subtitle="Track execution quality, win rates, and pair-level performance diagnostics."
      preferences={data?.preferences}
    >
      {/* Hero Metrics */}
      <MiniStatGrid>
        <HeroMetric label="Wins" value={String(analytics?.wins ?? 0)} footnote="Take-profit outcomes." accent="emerald" />
        <HeroMetric label="Losses" value={String(analytics?.losses ?? 0)} footnote="Stop-loss outcomes." accent="rose" />
        <HeroMetric label="Average RR" value={formatNumber(analytics?.avg_rr ?? 0)} footnote="Risk-reward across all trades." />
        <HeroMetric label="Best Pair" value={analytics?.best_pair ?? "N/A"} footnote="Highest edge based on outcomes." accent="amber" />
      </MiniStatGrid>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {/* Performance Strip */}
          <TerminalSurface title="Performance Summary" detail="Live metrics" icon={Trophy}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-4">
                <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Profit Factor</div>
                <div className="mt-2 font-mono text-2xl font-bold text-zinc-50">{formatNumber(analytics?.profit_factor ?? 0)}</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-4">
                <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Total Trades</div>
                <div className="mt-2 font-mono text-2xl font-bold text-zinc-50">{analytics?.total_trades ?? 0}</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-4">
                <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Active Trades</div>
                <div className="mt-2 font-mono text-2xl font-bold text-zinc-50">{analytics?.active_trades ?? 0}</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-4">
                <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Win Rate</div>
                <div className="mt-2 font-mono text-2xl font-bold text-zinc-50">{formatNumber(analytics?.win_rate ?? 0, "%")}</div>
              </div>
            </div>
          </TerminalSurface>

          {/* Trade Ledger */}
          <TerminalSurface title="Trade Ledger" detail={`${trades.length} entries`} icon={Activity} className="overflow-hidden">
            {trades.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-zinc-800 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="pb-3 pr-4">Pair</th>
                      <th className="pb-3 pr-4">Signal</th>
                      <th className="pb-3 pr-4">Setup</th>
                      <th className="pb-3 pr-4">Entry</th>
                      <th className="pb-3 pr-4">SL</th>
                      <th className="pb-3 pr-4">TP</th>
                      <th className="pb-3 pr-4">RR</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {trades.map((trade) => (
                      <tr key={trade.signal_id} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="py-3 pr-4 font-mono font-medium text-zinc-100">{trade.pair}</td>
                        <td className="py-3 pr-4">
                          <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium ${signalTone(trade.signal)}`}>
                            {trade.signal}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-zinc-400">{trade.setup_type ?? trade.setup_quality}</td>
                        <td className="py-3 pr-4 font-mono text-zinc-300">{trade.entry}</td>
                        <td className="py-3 pr-4 font-mono text-rose-400">{trade.sl}</td>
                        <td className="py-3 pr-4 font-mono text-emerald-400">{trade.tp}</td>
                        <td className="py-3 pr-4 font-mono text-zinc-300">{trade.rr}</td>
                        <td className={`py-3 pr-4 font-mono ${statusTone(trade.trade_status)}`}>{trade.trade_status}</td>
                        <td className="py-3 font-mono text-zinc-500">{formatDateTime(trade.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No trades recorded" body="Trade history will populate as the engine executes." />
            )}
          </TerminalSurface>

          {/* Pair Performance Matrix */}
          <TerminalSurface title="Pair Performance" detail={`${pairPerformance?.pairs.length ?? 0} pairs`} icon={BarChart3} className="overflow-hidden">
            {pairPerformance?.pairs.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="border-b border-zinc-800 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="pb-3 pr-4">Pair</th>
                      <th className="pb-3 pr-4">State</th>
                      <th className="pb-3 pr-4">Trades</th>
                      <th className="pb-3 pr-4">Win Rate</th>
                      <th className="pb-3 pr-4">Wins</th>
                      <th className="pb-3 pr-4">Losses</th>
                      <th className="pb-3 pr-4">Avg Bias</th>
                      <th className="pb-3">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {pairPerformance.pairs.map((row) => (
                      <tr key={row.pair} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="py-3 pr-4 font-mono font-medium text-zinc-100">{row.pair}</td>
                        <td className={`py-3 pr-4 font-mono ${row.enabled ? "text-emerald-400" : "text-zinc-500"}`}>
                          {row.enabled ? "ON" : "OFF"}
                        </td>
                        <td className="py-3 pr-4 font-mono text-zinc-300">{row.finished_trades}</td>
                        <td className="py-3 pr-4 font-mono text-zinc-300">{row.win_rate}%</td>
                        <td className="py-3 pr-4 font-mono text-emerald-400">{row.wins}</td>
                        <td className="py-3 pr-4 font-mono text-rose-400">{row.losses}</td>
                        <td className={`py-3 pr-4 font-mono ${row.avg_learning_bias >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {row.avg_learning_bias}
                        </td>
                        <td className="py-3 font-mono text-zinc-300">{Math.round(row.avg_confidence * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No pair data" body="Performance data appears after sufficient trade samples." />
            )}
          </TerminalSurface>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <TerminalSurface title="Learning Status" icon={BrainCircuit}>
            <div className="space-y-3">
              <DataChip label="Closed Trades" value={String(data?.learningStatus?.closed_trades_used ?? 0)} />
              <DataChip label="Net Outcome" value={String(data?.learningStatus?.net_outcome_score ?? 0)} />
              <DataChip label="Strongest Pair" value={data?.learningStatus?.strongest_pair ?? "N/A"} />
              <DataChip label="Strongest Setup" value={data?.learningStatus?.strongest_setup ?? "N/A"} />
            </div>
          </TerminalSurface>

          <TerminalSurface title="Optimizer State" icon={Trophy}>
            <div className="space-y-3">
              <DataChip 
                label="Auto Blocked" 
                value={data?.optimizer?.auto_blocked_pairs.join(", ") || "None"} 
              />
              <DataChip 
                label="Recommended On" 
                value={String(data?.optimizer?.recommended_enabled_pairs.length ?? 0)} 
              />
              <DataChip 
                label="Recommended Off" 
                value={String(data?.optimizer?.recommended_disabled_pairs.length ?? 0)} 
              />
            </div>
          </TerminalSurface>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <p className="text-xs leading-relaxed text-zinc-500">
              Analytics update in real-time as trades open and close. The optimizer uses this data to recommend pair adjustments.
            </p>
          </div>
        </div>
      </div>
    </TerminalShell>
  );
}
