"use client";

import { Activity, BarChart3 } from "lucide-react";

import { SectionHeader, TerminalShell, formatSignalTime, panelClassName, signalTone, statusTone } from "@/components/terminal-ui";
import { useDashboardData } from "@/components/use-live-data";

export function AnalyticsPage() {
  const { data } = useDashboardData();
  const trades = data?.trades ?? [];
  const pairPerformance = data?.pairPerformance;

  return (
    <TerminalShell title="Analytics" subtitle="Trade history, pair diagnostics, and live learning output." preferences={data?.preferences}>
      <div className="grid gap-3">
        <section className={`${panelClassName()} overflow-hidden rounded-lg`}>
          <div className="border-b border-white/6 px-3 py-2.5">
            <SectionHeader title="Trade History" detail={`${trades.length} rows`} icon={Activity} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-xs">
              <thead className="bg-white/[0.03] font-mono text-slate-500">
                <tr>
                  {["Pair", "Signal", "Quality", "Entry", "SL", "TP", "RR", "Status", "Time"].map((header) => (
                    <th className="px-3 py-2 font-medium" key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr className="border-t border-white/6 text-slate-300" key={trade.signal_id}>
                    <td className="px-3 py-2.5 font-mono text-white">{trade.pair}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-md border px-2 py-0.5 font-mono text-[11px] ${signalTone(trade.signal)}`}>{trade.signal}</span>
                    </td>
                    <td className="px-3 py-2.5">{trade.setup_quality}</td>
                    <td className="px-3 py-2.5 font-mono">{trade.entry}</td>
                    <td className="px-3 py-2.5 font-mono text-rose-200">{trade.sl}</td>
                    <td className="px-3 py-2.5 font-mono text-emerald-200">{trade.tp}</td>
                    <td className="px-3 py-2.5 font-mono">{trade.rr}</td>
                    <td className={`px-3 py-2.5 font-mono ${statusTone(trade.trade_status)}`}>{trade.trade_status}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-500">{formatSignalTime(trade.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${panelClassName()} overflow-hidden rounded-lg`}>
          <div className="border-b border-white/6 px-3 py-2.5">
            <SectionHeader title="Pair Performance" detail={`${pairPerformance?.pairs.length ?? 0} pairs`} icon={BarChart3} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="bg-white/[0.03] font-mono text-slate-500">
                <tr>
                  {["Pair", "Enabled", "Finished", "Wins", "Losses", "Win Rate", "Avg Bias", "Avg Conf"].map((header) => (
                    <th className="px-3 py-2 font-medium" key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(pairPerformance?.pairs ?? []).map((row) => (
                  <tr className="border-t border-white/6 text-slate-300" key={row.pair}>
                    <td className="px-3 py-2.5 font-mono text-white">{row.pair}</td>
                    <td className={`px-3 py-2.5 font-mono ${row.enabled ? "text-emerald-300" : "text-slate-500"}`}>{row.enabled ? "ON" : "OFF"}</td>
                    <td className="px-3 py-2.5 font-mono">{row.finished_trades}</td>
                    <td className="px-3 py-2.5 font-mono text-emerald-300">{row.wins}</td>
                    <td className="px-3 py-2.5 font-mono text-rose-300">{row.losses}</td>
                    <td className="px-3 py-2.5 font-mono">{row.win_rate}%</td>
                    <td className={`px-3 py-2.5 font-mono ${row.avg_learning_bias >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{row.avg_learning_bias}</td>
                    <td className="px-3 py-2.5 font-mono">{Math.round(row.avg_confidence * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </TerminalShell>
  );
}
