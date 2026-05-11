"use client";

import {
  Activity,
  BarChart3,
  Bot,
  BrainCircuit,
  ChevronRight,
  Gauge,
  LayoutGrid,
  LineChart,
  Radio,
  RefreshCw,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { applyOptimizer, forceScan, getDashboardState, resetState, runTradeManager, saveStrategySettings } from "@/lib/api";
import { TradingViewWidget } from "@/components/TradingViewWidget";
import type { Analytics, LearningStatus, OptimizerState, PairPerformanceState, StrategySettings, TradeSignal } from "@/lib/types";

const navItems = [
  { label: "Overview", icon: LayoutGrid, key: "overview" },
  { label: "Signals", icon: Radio, key: "signals" },
  { label: "Analytics", icon: Gauge, key: "analytics" },
  { label: "Settings", icon: Settings, key: "settings" },
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

const strategyPairs = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "EURJPY"];
const strategySetups = ["BUY_PULLBACK", "SELL_PULLBACK"];
const defaultSettings: StrategySettings = {
  enabled_pairs: strategyPairs,
  enabled_setups: strategySetups,
  min_confidence: 0.6,
  auto_block_enabled: true,
  telegram_chat_ids: [],
};

function formatNumber(value: number, suffix = "") {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)}${suffix}`;
}

function formatSignalTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function panelClassName(extra = "") {
  return `border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(8,12,20,0.96))] shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_14px_40px_rgba(2,6,23,0.35)] ${extra}`.trim();
}

function signalTone(signal: TradeSignal["signal"]) {
  if (signal === "BUY") return "border-emerald-400/30 bg-emerald-400/12 text-emerald-200";
  if (signal === "SELL") return "border-rose-400/30 bg-rose-400/12 text-rose-200";
  return "border-amber-300/30 bg-amber-300/12 text-amber-100";
}

function statusTone(status: TradeSignal["trade_status"]) {
  if (status === "WIN") return "text-emerald-300";
  if (status === "LOSS") return "text-rose-300";
  if (status === "OPEN") return "text-cyan-200";
  return "text-slate-400";
}

function ConfidenceMeter({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  const tone = percent >= 80 ? "bg-emerald-300" : percent >= 60 ? "bg-cyan-300" : "bg-amber-300";

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
        <span>Confidence</span>
        <strong className="text-slate-100">{percent}%</strong>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  detail,
  icon: Icon,
}: {
  title: string;
  detail?: string;
  icon?: typeof BarChart3;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {Icon ? <Icon size={15} className="text-slate-500" /> : null}
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
      </div>
      {detail ? <span className="font-mono text-[11px] text-slate-500">{detail}</span> : null}
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: typeof Activity;
  accent: string;
}) {
  return (
    <div className={`${panelClassName()} rounded-lg p-3`}>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-white">{value}</div>
        </div>
        <div className={`grid size-9 place-items-center rounded-md border ${accent}`}>
          <Icon size={15} />
        </div>
      </div>
      <div className="h-px bg-white/6" />
    </div>
  );
}

function MetricPill({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] ${tone ?? "border-white/10 bg-white/[0.04] text-slate-300"}`}>
      <span className="text-slate-500">{label}</span>
      <strong className="font-mono text-slate-100">{value}</strong>
    </div>
  );
}

export function Dashboard() {
  const [analytics, setAnalytics] = useState<Analytics>(initialAnalytics);
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [trades, setTrades] = useState<TradeSignal[]>([]);
  const [activeTelegramTrade, setActiveTelegramTrade] = useState<TradeSignal | null>(null);
  const [latestTelegramTrade, setLatestTelegramTrade] = useState<TradeSignal | null>(null);
  const [learningStatus, setLearningStatus] = useState<LearningStatus | null>(null);
  const [pairPerformance, setPairPerformance] = useState<PairPerformanceState | null>(null);
  const [optimizer, setOptimizer] = useState<OptimizerState | null>(null);
  const [strategySettings, setStrategySettings] = useState<StrategySettings>(defaultSettings);
  const [selectedPair, setSelectedPair] = useState("EURUSD");
  const [lastUpdated, setLastUpdated] = useState("Waiting for API");
  const [activeSection, setActiveSection] = useState("overview");
  const [isPending, startTransition] = useTransition();
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({
    overview: null,
    signals: null,
    analytics: null,
    settings: null,
  });

  const activeSignal = useMemo(
    () => signals.find((signal) => signal.pair === selectedPair) ?? signals[0] ?? null,
    [selectedPair, signals],
  );

  async function refresh() {
    const state = await getDashboardState();
    setAnalytics(state.analytics);
    setSignals(state.signals);
    setTrades(state.trades);
    setActiveTelegramTrade(state.activeTelegramTrade);
    setLatestTelegramTrade(state.latestTelegramTrade);
    setLearningStatus(state.learningStatus);
    setPairPerformance(state.pairPerformance);
    setOptimizer(state.optimizer);
    setStrategySettings(state.strategySettings ?? defaultSettings);
    if (!state.signals.some((signal) => signal.pair === selectedPair) && state.signals[0]) {
      setSelectedPair(state.signals[0].pair);
    }
    setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      void runTradeManager().then(refresh);
    }, 10_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (visible?.target instanceof HTMLElement) {
          setActiveSection(visible.target.dataset.section ?? "overview");
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.2, 0.35, 0.5, 0.7] },
    );

    const refs = Object.values(sectionRefs.current).filter(Boolean) as HTMLElement[];
    refs.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  function handleForceScan() {
    startTransition(() => {
      void forceScan().then(refresh);
    });
  }

  function togglePair(pair: string) {
    const enabled = strategySettings.enabled_pairs.includes(pair);
    setStrategySettings({
      ...strategySettings,
      enabled_pairs: enabled ? strategySettings.enabled_pairs.filter((item) => item !== pair) : [...strategySettings.enabled_pairs, pair],
    });
  }

  function toggleSetup(setup: string) {
    const enabled = strategySettings.enabled_setups.includes(setup);
    setStrategySettings({
      ...strategySettings,
      enabled_setups: enabled ? strategySettings.enabled_setups.filter((item) => item !== setup) : [...strategySettings.enabled_setups, setup],
    });
  }

  function handleSaveSettings() {
    startTransition(() => {
      void saveStrategySettings(strategySettings).then(refresh);
    });
  }

  function handleResetState() {
    startTransition(() => {
      void resetState().then(refresh);
    });
  }

  function handleApplyOptimizer() {
    startTransition(() => {
      void applyOptimizer().then(refresh);
    });
  }

  function scrollToSection(section: string) {
    setActiveSection(section);
    sectionRefs.current[section]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const metricCards = [
    { label: "Total Trades", value: analytics.total_trades, icon: Activity, accent: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200" },
    { label: "Win Rate", value: formatNumber(analytics.win_rate, "%"), icon: Target, accent: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" },
    { label: "Active", value: analytics.active_trades, icon: Radio, accent: "border-violet-400/20 bg-violet-400/10 text-violet-200" },
    { label: "Profit Factor", value: analytics.profit_factor, icon: ShieldCheck, accent: "border-amber-300/20 bg-amber-300/10 text-amber-100" },
    { label: "Avg RR", value: analytics.avg_rr, icon: LineChart, accent: "border-sky-400/20 bg-sky-400/10 text-sky-200" },
    { label: "Best Pair", value: analytics.best_pair, icon: Bot, accent: "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200" },
  ];

  return (
    <main className="min-h-screen bg-[#05070d] text-slate-100">
      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[72px_minmax(0,1fr)]">
        <aside className="hidden border-r border-white/6 bg-[#060a12] xl:block">
          <div className="flex h-full flex-col items-center gap-5 py-4">
            <div className="grid size-11 place-items-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 font-mono text-sm font-black text-cyan-200">
              FX
            </div>
            <nav className="flex flex-1 flex-col gap-2">
              {navItems.map((item) => (
                <button
                  aria-label={item.label}
                  className={`grid size-11 place-items-center rounded-lg border transition ${
                    activeSection === item.key
                      ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-100"
                      : "border-transparent text-slate-500 hover:border-cyan-300/20 hover:bg-cyan-300/10 hover:text-cyan-100"
                  }`}
                  key={item.label}
                  onClick={() => scrollToSection(item.key)}
                  type="button"
                >
                  <item.icon size={18} />
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-white/6 bg-[rgba(5,7,13,0.92)] px-4 py-4 backdrop-blur xl:px-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 font-mono text-[11px] text-cyan-100">
                      Forex AI Radar
                    </span>
                    <span className="hidden text-[11px] text-slate-500 sm:block">PostgreSQL runtime</span>
                  </div>
                  <h1 className="text-xl font-semibold tracking-normal text-white sm:text-2xl">AI forex terminal with live pair controls and adaptive filtering</h1>
                  <p className="mt-1 text-sm text-slate-400">Trading dashboard, live signals, optimizer controls, and Telegram flow in one compact surface.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <MetricPill label="Data" value="Yahoo Finance" tone="border-emerald-300/20 bg-emerald-300/10 text-emerald-100" />
                  <MetricPill label="Last sync" value={lastUpdated} />
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-60"
                    disabled={isPending}
                    onClick={handleForceScan}
                    type="button"
                  >
                    <RefreshCw size={16} />
                    {isPending ? "Scanning" : "Force Scan"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:hidden">
                {navItems.map((item) => (
                  <button
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      activeSection === item.key
                        ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-100"
                        : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/15"
                    }`}
                    key={item.label}
                    onClick={() => scrollToSection(item.key)}
                    type="button"
                  >
                    <item.icon size={14} className="text-slate-500" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="px-3 py-3 sm:px-4 xl:px-5">
            <section
              className="grid scroll-mt-28 grid-cols-2 gap-2 lg:grid-cols-3 2xl:grid-cols-6"
              data-section="overview"
              ref={(element) => {
                sectionRefs.current.overview = element;
              }}
            >
              {metricCards.map((metric) => (
                <StatTile key={metric.label} {...metric} />
              ))}
            </section>

            <div className="mt-3 grid gap-3 2xl:grid-cols-[minmax(0,1.2fr)_380px]">
              <div className="grid min-w-0 gap-3">
                <section
                  className="grid scroll-mt-28 gap-3 xl:grid-cols-[minmax(0,1fr)_250px]"
                  data-section="signals"
                  ref={(element) => {
                    sectionRefs.current.signals = element;
                  }}
                >
                  <div className={`${panelClassName()} overflow-hidden rounded-lg`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/6 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={15} className="text-cyan-300" />
                        <div>
                          <div className="font-mono text-sm text-white">{selectedPair}</div>
                          <div className="text-[11px] text-slate-500">Chart focus</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <MetricPill label="Session" value={activeSignal?.session ?? "Offline"} />
                        <MetricPill label="Setup" value={activeSignal?.setup_type ?? "NONE"} />
                      </div>
                    </div>
                    <TradingViewWidget symbol={selectedPair} />
                  </div>

                  <div className={`${panelClassName()} rounded-lg p-3`}>
                    <SectionHeader title="Watchlist" detail="5m live scan" icon={Radio} />

                    {latestTelegramTrade ? (
                      <div className={`mb-3 rounded-lg border p-3 ${activeTelegramTrade ? "border-cyan-300/30 bg-cyan-300/10" : "border-white/8 bg-white/[0.03]"}`}>
                        <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-cyan-100">
                          {activeTelegramTrade ? "Telegram active trade" : "Last Telegram trade"}
                        </div>
                        <div className="flex items-center justify-between gap-2 font-mono text-sm">
                          <strong>{latestTelegramTrade.pair}</strong>
                          <span className={statusTone(latestTelegramTrade.trade_status)}>
                            {latestTelegramTrade.signal} / {latestTelegramTrade.trade_status}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-2">
                      {signals.slice(0, 8).map((signal) => (
                        <button
                          className={`rounded-lg border px-3 py-2.5 text-left transition ${selectedPair === signal.pair ? "border-cyan-300/35 bg-cyan-300/10" : "border-white/8 bg-white/[0.03] hover:border-white/15"}`}
                          key={signal.signal_id}
                          onClick={() => setSelectedPair(signal.pair)}
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
                  </div>
                </section>

                <section
                  className={`${panelClassName()} scroll-mt-28 overflow-hidden rounded-lg`}
                  data-section="analytics"
                  ref={(element) => {
                    sectionRefs.current.analytics = element;
                  }}
                >
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

              <aside className="grid content-start gap-3">
                <section
                  className={`${panelClassName()} scroll-mt-28 rounded-lg p-3`}
                  data-section="settings"
                  ref={(element) => {
                    sectionRefs.current.settings = element;
                  }}
                >
                  <SectionHeader title="AI Signal Stack" detail={activeSignal?.session ?? "Offline"} icon={Sparkles} />
                  <div className="grid gap-2">
                    {signals.slice(0, 6).map((signal) => (
                      <article className="rounded-lg border border-white/8 bg-white/[0.03] p-3" key={signal.signal_id}>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <strong className="font-mono text-sm text-white">{signal.pair}</strong>
                          <span className={`rounded-md border px-2 py-0.5 text-[11px] ${signalTone(signal.signal)}`}>{signal.signal}</span>
                        </div>
                        <div className="mb-3 grid grid-cols-3 gap-2 font-mono text-[11px]">
                          <div><span className="text-slate-500">RR</span><strong className="mt-1 block text-white">{signal.rr}</strong></div>
                          <div><span className="text-slate-500">RSI</span><strong className="mt-1 block text-white">{signal.rsi}</strong></div>
                          <div><span className="text-slate-500">Score</span><strong className="mt-1 block text-white">{signal.setup_score}</strong></div>
                        </div>
                        <ConfidenceMeter value={signal.confidence} />
                      </article>
                    ))}
                  </div>
                </section>

                <section className={`${panelClassName()} rounded-lg p-3`}>
                  <SectionHeader title="Adaptive Learning" icon={BrainCircuit} />
                  {learningStatus ? (
                    <div className="grid gap-2 font-mono text-xs">
                      <div className="flex justify-between"><span className="text-slate-500">Closed trades used</span><strong>{learningStatus.closed_trades_used}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">Wins / Losses</span><strong>{learningStatus.wins} / {learningStatus.losses}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">Net outcome score</span><strong className={learningStatus.net_outcome_score >= 0 ? "text-emerald-300" : "text-rose-300"}>{learningStatus.net_outcome_score}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">Strongest pair</span><strong>{learningStatus.strongest_pair}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">Strongest setup</span><strong>{learningStatus.strongest_setup}</strong></div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Learning status unavailable.</p>
                  )}
                </section>

                <section className={`${panelClassName()} rounded-lg p-3`}>
                  <SectionHeader title="Optimizer" icon={SlidersHorizontal} />
                  {optimizer ? (
                    <div className="grid gap-2 font-mono text-xs">
                      <div className="flex justify-between"><span className="text-slate-500">Auto blocked</span><strong>{optimizer.auto_blocked_pairs.length ? optimizer.auto_blocked_pairs.join(", ") : "None"}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">Recommended on</span><strong>{optimizer.recommended_enabled_pairs.length}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">Recommended off</span><strong>{optimizer.recommended_disabled_pairs.length}</strong></div>
                      <div className="mt-1 grid gap-1">
                        {optimizer.recommendations.slice(0, 6).map((item) => (
                          <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-2" key={item.pair}>
                            <span>{item.pair}</span>
                            <span className={item.action === "disable" ? "text-rose-300" : "text-emerald-300"}>{item.action} / {item.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Optimizer unavailable.</p>
                  )}
                </section>

                <section className={`${panelClassName()} rounded-lg p-3`}>
                  <SectionHeader title="Strategy Controls" detail="Live" icon={Settings} />
                  <div className="grid gap-3 text-xs">
                    <div>
                      <div className="mb-2 text-slate-500">Enabled pairs</div>
                      <div className="grid grid-cols-2 gap-2">
                        {strategyPairs.map((pair) => {
                          const enabled = strategySettings.enabled_pairs.includes(pair);
                          return (
                            <button
                              className={`rounded-lg border px-2 py-2 text-left transition ${enabled ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100" : "border-white/8 bg-white/[0.03] text-slate-400 hover:border-white/15"}`}
                              key={pair}
                              onClick={() => togglePair(pair)}
                              type="button"
                            >
                              {pair}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-slate-500">Enabled setups</div>
                      <div className="grid gap-2">
                        {strategySetups.map((setup) => {
                          const enabled = strategySettings.enabled_setups.includes(setup);
                          return (
                            <button
                              className={`rounded-lg border px-2 py-2 text-left transition ${enabled ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100" : "border-white/8 bg-white/[0.03] text-slate-400 hover:border-white/15"}`}
                              key={setup}
                              onClick={() => toggleSetup(setup)}
                              type="button"
                            >
                              {setup}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between text-slate-500">
                        <span>Telegram min confidence</span>
                        <strong className="font-mono text-white">{Math.round(strategySettings.min_confidence * 100)}%</strong>
                      </div>
                      <input
                        className="w-full accent-cyan-300"
                        max={0.9}
                        min={0.4}
                        onChange={(event) => setStrategySettings({ ...strategySettings, min_confidence: Number(event.target.value) })}
                        step={0.01}
                        type="range"
                        value={strategySettings.min_confidence}
                      />
                    </div>

                    <label className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-2">
                      <span className="text-slate-400">Auto pair blocking</span>
                      <input
                        checked={strategySettings.auto_block_enabled}
                        className="accent-cyan-300"
                        onChange={(event) => setStrategySettings({ ...strategySettings, auto_block_enabled: event.target.checked })}
                        type="checkbox"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-60"
                        disabled={isPending}
                        onClick={handleSaveSettings}
                        type="button"
                      >
                        Save controls
                      </button>
                      <button
                        className="rounded-lg border border-rose-300/25 bg-rose-300/10 px-3 py-2 text-rose-100 transition hover:bg-rose-300/20 disabled:opacity-60"
                        disabled={isPending}
                        onClick={handleResetState}
                        type="button"
                      >
                        Hard reset
                      </button>
                    </div>

                    <button
                      className="inline-flex items-center justify-between rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-amber-100 transition hover:bg-amber-300/20 disabled:opacity-60"
                      disabled={isPending}
                      onClick={handleApplyOptimizer}
                      type="button"
                    >
                      <span>Apply optimizer</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </section>

                <section className={`${panelClassName()} rounded-lg p-3`}>
                  <SectionHeader title="Live Market State" icon={Gauge} />
                  {activeSignal ? (
                    <div className="grid gap-2 font-mono text-xs">
                      <div className="flex justify-between"><span className="text-slate-500">Pair</span><strong>{activeSignal.pair}</strong></div>
                      <div className="flex justify-between gap-3"><span className="text-slate-500">Trend</span><strong className="text-right">{activeSignal.trend_bias}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">ATR</span><strong>{activeSignal.atr}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">EMA 12</span><strong>{activeSignal.ema_fast}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">EMA 26</span><strong>{activeSignal.ema_slow}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">Setup</span><strong>{activeSignal.setup_type ?? "NONE"}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">Learning bias</span><strong className={(activeSignal.learning_bias ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}>{activeSignal.learning_bias ?? 0}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">Source</span><strong className="text-amber-100">{activeSignal.source}</strong></div>
                      <ConfidenceMeter value={activeSignal.confidence} />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Start the backend or run a force scan to populate signals.</p>
                  )}
                </section>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
