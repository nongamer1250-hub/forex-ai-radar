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
      subtitle="Track execution quality, win rates, and pair-level diagnostics."
      preferences={data?.preferences}
    >
      {/* Hero Metrics */}
      <MiniStatGrid>
        <HeroMetric label="Wins" value={String(analytics?.wins ?? 0)} footnote="Take-profit outcomes" accent="success" />
        <HeroMetric label="Losses" value={String(analytics?.losses ?? 0)} footnote="Stop-loss outcomes" accent="danger" />
        <HeroMetric label="Avg RR" value={formatNumber(analytics?.avg_rr ?? 0)} footnote="Risk-reward ratio" />
        <HeroMetric label="Best Pair" value={analytics?.best_pair ?? "N/A"} footnote="Highest edge" accent="warning" />
      </MiniStatGrid>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {/* Performance Summary */}
          <TerminalSurface title="Performance" detail="Live" icon={Trophy}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border bg-secondary/30 p-3.5">
                <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Profit Factor</div>
                <div className="mt-1.5 font-mono text-xl font-bold text-foreground">{formatNumber(analytics?.profit_factor ?? 0)}</div>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-3.5">
                <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Total Trades</div>
                <div className="mt-1.5 font-mono text-xl font-bold text-foreground">{analytics?.total_trades ?? 0}</div>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-3.5">
                <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Active</div>
                <div className="mt-1.5 font-mono text-xl font-bold text-foreground">{analytics?.active_trades ?? 0}</div>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-3.5">
                <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Win Rate</div>
                <div className="mt-1.5 font-mono text-xl font-bold text-success">{formatNumber(analytics?.win_rate ?? 0, "%")}</div>
              </div>
            </div>
          </TerminalSurface>

          {/* Trade Ledger */}
          <TerminalSurface title="Trade Ledger" detail={`${trades.length} entries`} icon={Activity} noPadding>
            {trades.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="border-b border-border bg-secondary/30 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5">Pair</th>
                      <th className="px-4 py-2.5">Signal</th>
                      <th className="px-4 py-2.5">Setup</th>
                      <th className="px-4 py-2.5">Entry</th>
                      <th className="px-4 py-2.5">SL</th>
                      <th className="px-4 py-2.5">TP</th>
                      <th className="px-4 py-2.5">RR</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {trades.map((trade) => (
                      <tr key={trade.signal_id} className="transition-colors hover:bg-secondary/30">
                        <td className="px-4 py-3 font-mono font-semibold text-foreground">{trade.pair}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${signalTone(trade.signal)}`}>
                            {trade.signal}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{trade.setup_type ?? trade.setup_quality}</td>
                        <td className="px-4 py-3 font-mono text-foreground">{trade.entry}</td>
                        <td className="px-4 py-3 font-mono text-danger">{trade.sl}</td>
                        <td className="px-4 py-3 font-mono text-success">{trade.tp}</td>
                        <td className="px-4 py-3 font-mono text-foreground">{trade.rr}</td>
                        <td className={`px-4 py-3 font-mono font-medium ${statusTone(trade.trade_status)}`}>{trade.trade_status}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{formatDateTime(trade.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4">
                <EmptyState title="No trades" body="Trade history populates as the engine executes." />
              </div>
            )}
          </TerminalSurface>

          {/* Pair Performance */}
          <TerminalSurface title="Pair Performance" detail={`${pairPerformance?.pairs.length ?? 0} pairs`} icon={BarChart3} noPadding>
            {pairPerformance?.pairs.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[750px] text-left text-sm">
                  <thead className="border-b border-border bg-secondary/30 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5">Pair</th>
                      <th className="px-4 py-2.5">State</th>
                      <th className="px-4 py-2.5">Trades</th>
                      <th className="px-4 py-2.5">Win Rate</th>
                      <th className="px-4 py-2.5">Wins</th>
                      <th className="px-4 py-2.5">Losses</th>
                      <th className="px-4 py-2.5">Avg Bias</th>
                      <th className="px-4 py-2.5">Conf</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {pairPerformance.pairs.map((row) => (
                      <tr key={row.pair} className="transition-colors hover:bg-secondary/30">
                        <td className="px-4 py-3 font-mono font-semibold text-foreground">{row.pair}</td>
                        <td className={`px-4 py-3 font-mono font-medium ${row.enabled ? "text-success" : "text-muted-foreground"}`}>
                          {row.enabled ? "ON" : "OFF"}
                        </td>
                        <td className="px-4 py-3 font-mono text-foreground">{row.finished_trades}</td>
                        <td className="px-4 py-3 font-mono text-foreground">{row.win_rate}%</td>
                        <td className="px-4 py-3 font-mono text-success">{row.wins}</td>
                        <td className="px-4 py-3 font-mono text-danger">{row.losses}</td>
                        <td className={`px-4 py-3 font-mono font-medium ${row.avg_learning_bias >= 0 ? "text-success" : "text-danger"}`}>
                          {row.avg_learning_bias}
                        </td>
                        <td className="px-4 py-3 font-mono text-foreground">{Math.round(row.avg_confidence * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4">
                <EmptyState title="No pair data" body="Data appears after sufficient trades." />
              </div>
            )}
          </TerminalSurface>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <TerminalSurface title="Learning" icon={BrainCircuit}>
            <div className="space-y-2.5">
              <DataChip label="Closed Trades" value={String(data?.learningStatus?.closed_trades_used ?? 0)} />
              <DataChip label="Net Outcome" value={String(data?.learningStatus?.net_outcome_score ?? 0)} />
              <DataChip label="Strongest Pair" value={data?.learningStatus?.strongest_pair ?? "N/A"} />
              <DataChip label="Strongest Setup" value={data?.learningStatus?.strongest_setup ?? "N/A"} />
            </div>
          </TerminalSurface>

          <TerminalSurface title="Optimizer" icon={Trophy}>
            <div className="space-y-2.5">
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

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Analytics update in real-time as trades open and close. The optimizer uses this data for recommendations.
            </p>
          </div>
        </div>
      </div>
    </TerminalShell>
  );
}
