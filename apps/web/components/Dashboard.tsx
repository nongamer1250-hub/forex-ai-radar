"use client";

import { Activity, BarChart3, Bot, Gauge, LineChart, Radio, RefreshCw, Settings, ShieldCheck, Target } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { forceScan, getDashboardState, runTradeManager } from "@/lib/api";
import type { Analytics, TradeSignal } from "@/lib/types";
import { TradingViewWidget } from "@/components/TradingViewWidget";

const navItems = [
  { label: "Overview", icon: BarChart3 },
  { label: "Signals", icon: Radio },
  { label: "Analytics", icon: Gauge },
  { label: "Settings", icon: Settings },
];

const initialAnalytics: Analytics = {
  total_trades: 0,
  wins: 0,
  losses: 0,
  win_rate: 0,
  active_trades: 0,
  avg_rr: 0,
  best_pair: "N/A",
  profit_factor: 0,
};

function formatNumber(value: number, suffix = "") {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)}${suffix}`;
}

function signalTone(signal: TradeSignal["signal"]) {
  if (signal === "BUY") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (signal === "SELL") return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  return "border-amber-300/30 bg-amber-300/10 text-amber-100";
}

function statusTone(status: TradeSignal["trade_status"]) {
  if (status === "WIN") return "text-emerald-300";
  if (status === "LOSS") return "text-rose-300";
  if (status === "OPEN") return "text-cyan-200";
  return "text-slate-400";
}

function ConfidenceMeter({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  const tone = percent >= 82 ? "bg-emerald-300" : percent >= 70 ? "bg-cyan-300" : "bg-amber-300";
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
        <span>Confidence</span>
        <strong className="text-white">{percent}%</strong>
      </div>
      <div className="h-1.5 overflow-hidden bg-white/10">
        <div className={`h-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function Dashboard() {
  const [analytics, setAnalytics] = useState<Analytics>(initialAnalytics);
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [trades, setTrades] = useState<TradeSignal[]>([]);
  const [activeTelegramTrade, setActiveTelegramTrade] = useState<TradeSignal | null>(null);
  const [latestTelegramTrade, setLatestTelegramTrade] = useState<TradeSignal | null>(null);
  const [selectedPair, setSelectedPair] = useState("EURUSD");
  const [lastUpdated, setLastUpdated] = useState<string>("Waiting for API");
  const [isPending, startTransition] = useTransition();

  const activeSignal = useMemo(
    () => signals.find((signal) => signal.pair === selectedPair) ?? signals[0],
    [selectedPair, signals],
  );

  async function refresh() {
    const state = await getDashboardState();
    setAnalytics(state.analytics);
    setSignals(state.signals);
    setTrades(state.trades);
    setActiveTelegramTrade(state.activeTelegramTrade);
    setLatestTelegramTrade(state.latestTelegramTrade);
    if (!state.signals.some((signal) => signal.pair === selectedPair) && state.signals[0]) {
      setSelectedPair(state.signals[0].pair);
    }
    setLastUpdated(new Date().toLocaleTimeString());
  }

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      void runTradeManager().then(refresh);
    }, 10_000);
    return () => window.clearInterval(interval);
  }, []);

  function handleForceScan() {
    startTransition(() => {
      void forceScan().then((nextSignals) => {
        setSignals(nextSignals);
        return refresh();
      });
    });
  }

  const metricCards = [
    { label: "Total Trades", value: analytics.total_trades, icon: Activity },
    { label: "Win Rate", value: formatNumber(analytics.win_rate, "%"), icon: Target },
    { label: "Active", value: analytics.active_trades, icon: Radio },
    { label: "Profit Factor", value: analytics.profit_factor, icon: ShieldCheck },
    { label: "Avg RR", value: analytics.avg_rr, icon: LineChart },
    { label: "Best Pair", value: analytics.best_pair, icon: Bot },
  ];

  return (
    <main className="min-h-screen bg-[#05070d] text-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[72px_minmax(0,1fr)]">
        <aside className="hidden border-r border-white/10 bg-[#080d16] lg:block">
          <div className="flex h-full flex-col items-center gap-5 py-4">
            <div className="grid size-11 place-items-center border border-cyan-300/30 bg-cyan-300/10 font-mono text-sm font-black text-cyan-200">
              FX
            </div>
            <nav className="flex flex-1 flex-col gap-2">
              {navItems.map((item) => (
                <button
                  aria-label={item.label}
                  className="grid size-11 place-items-center border border-transparent text-slate-400 transition hover:border-cyan-300/20 hover:bg-cyan-300/10 hover:text-cyan-100"
                  key={item.label}
                  type="button"
                >
                  <item.icon size={18} />
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <section className="grid grid-rows-[auto_minmax(0,1fr)]">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#080d16]/95 px-4 py-3">
            <div>
              <h1 className="font-mono text-lg font-semibold tracking-normal text-white">Forex AI Radar</h1>
              <p className="text-xs text-slate-400">AI signal engine • SQLite lifecycle ledger • last update {lastUpdated}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-100">
                Real candles: Yahoo Finance
              </span>
              <button
                className="inline-flex items-center gap-2 border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-300/20"
                disabled={isPending}
                onClick={handleForceScan}
                type="button"
              >
                <RefreshCw size={16} />
                {isPending ? "Scanning" : "Force Scan"}
              </button>
            </div>
          </header>

          <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid min-h-0 gap-3">
              <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                {metricCards.map((metric) => (
                  <div className="border border-white/10 bg-[#0b111d] p-3" key={metric.label}>
                    <div className="mb-3 flex items-center justify-between text-slate-400">
                      <span className="text-[11px] uppercase">{metric.label}</span>
                      <metric.icon size={15} />
                    </div>
                    <strong className="font-mono text-xl text-white">{metric.value}</strong>
                  </div>
                ))}
              </section>

              <section className="grid min-h-[480px] gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
                <TradingViewWidget symbol={selectedPair} />
                <div className="border border-white/10 bg-[#0b111d] p-3">
                  {latestTelegramTrade ? (
                    <div className={`mb-3 border p-2 ${activeTelegramTrade ? "border-cyan-300/30 bg-cyan-300/10" : "border-white/10 bg-white/[0.03]"}`}>
                      <div className="text-[11px] uppercase text-cyan-100">
                        {activeTelegramTrade ? "Telegram active trade" : "Last Telegram trade"}
                      </div>
                      <div className="mt-1 flex items-center justify-between font-mono text-xs">
                        <strong>{latestTelegramTrade.pair}</strong>
                        <span className={statusTone(latestTelegramTrade.trade_status)}>
                          {latestTelegramTrade.signal} / {latestTelegramTrade.trade_status}
                        </span>
                      </div>
                    </div>
                  ) : null}
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Watchlist</h2>
                    <span className="font-mono text-[11px] text-cyan-200">5m scan</span>
                  </div>
                  <div className="grid gap-2">
                    {signals.slice(0, 8).map((signal) => (
                      <button
                        className={`border px-3 py-2 text-left ${selectedPair === signal.pair ? "border-cyan-300/50 bg-cyan-300/10" : "border-white/10 bg-white/[0.03]"}`}
                        key={signal.signal_id}
                        onClick={() => setSelectedPair(signal.pair)}
                        type="button"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="font-mono text-sm">{signal.pair}</strong>
                          <span className={statusTone(signal.trade_status)}>{signal.trade_status}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                          <span>{signal.signal}</span>
                          <span>{Math.round(signal.confidence * 100)}%</span>
                        </div>
                        <div className="mt-2 h-1 bg-white/10">
                          <div className="h-full bg-cyan-300" style={{ width: `${Math.round(signal.confidence * 100)}%` }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="overflow-hidden border border-white/10 bg-[#0b111d]">
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                  <h2 className="text-sm font-semibold">Trade History</h2>
                  <span className="text-xs text-slate-400">{trades.length} rows</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left font-mono text-xs">
                    <thead className="bg-white/[0.03] text-slate-400">
                      <tr>
                        {["Pair", "Signal", "Quality", "RR", "Entry", "SL", "TP", "Status", "Time"].map((header) => (
                          <th className="px-3 py-2 font-medium" key={header}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map((trade) => (
                        <tr className="border-t border-white/10" key={trade.signal_id}>
                          <td className="px-3 py-2 text-white">{trade.pair}</td>
                          <td className="px-3 py-2">{trade.signal}</td>
                          <td className="px-3 py-2">{trade.setup_quality}</td>
                          <td className="px-3 py-2">{trade.rr}</td>
                          <td className="px-3 py-2">{trade.entry}</td>
                          <td className="px-3 py-2 text-rose-200">{trade.sl}</td>
                          <td className="px-3 py-2 text-emerald-200">{trade.tp}</td>
                          <td className={`px-3 py-2 ${statusTone(trade.trade_status)}`}>{trade.trade_status}</td>
                          <td className="px-3 py-2 text-slate-400">{new Date(trade.timestamp).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <aside className="grid content-start gap-3">
              <section className="border border-white/10 bg-[#0b111d] p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">AI Signal Stack</h2>
                  <span className="text-xs text-slate-400">{activeSignal?.session ?? "Offline"}</span>
                </div>
                {signals.slice(0, 6).map((signal) => (
                  <article className="mb-2 border border-white/10 bg-white/[0.03] p-3" key={signal.signal_id}>
                    <div className="mb-3 flex items-center justify-between">
                      <strong className="font-mono">{signal.pair}</strong>
                      <span className={`border px-2 py-1 text-xs ${signalTone(signal.signal)}`}>{signal.signal}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-slate-500">RR</span><strong className="block text-white">{signal.rr}</strong></div>
                      <div><span className="text-slate-500">RSI</span><strong className="block text-white">{signal.rsi}</strong></div>
                      <div><span className="text-slate-500">Score</span><strong className="block text-white">{signal.setup_score}</strong></div>
                    </div>
                    <div className="mt-3">
                      <ConfidenceMeter value={signal.confidence} />
                    </div>
                  </article>
                ))}
              </section>

              <section className="border border-white/10 bg-[#0b111d] p-3">
                <h2 className="mb-3 text-sm font-semibold">Live Market State</h2>
                {activeSignal ? (
                  <div className="grid gap-2 font-mono text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Pair</span><strong>{activeSignal.pair}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">Trend</span><strong>{activeSignal.trend_bias}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">ATR</span><strong>{activeSignal.atr}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">EMA 12</span><strong>{activeSignal.ema_fast}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">EMA 26</span><strong>{activeSignal.ema_slow}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500">Source</span><strong className="text-amber-100">{activeSignal.source}</strong></div>
                    <ConfidenceMeter value={activeSignal.confidence} />
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Start the backend or run a force scan to populate signals.</p>
                )}
              </section>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
