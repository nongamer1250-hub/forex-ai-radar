import type { Analytics, DashboardState, DemoAccount, DemoTrade, LearningStatus, OptimizerState, PairPerformanceState, StrategySettings, TradeSignal } from "@/lib/types";
import { STRATEGY_PAIRS } from "@/lib/constants";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

const emptyAnalytics: Analytics = {
  total_trades: 0,
  wins: 0,
  losses: 0,
  win_rate: 0,
  active_trades: 0,
  avg_rr: 0,
  best_pair: "N/A",
  profit_factor: 0,
};

async function fetchJson<T>(path: string, fallback: T, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store", ...init });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export async function getDashboardState(): Promise<DashboardState> {
  const [analytics, signals, trades, activeTelegramTrade, latestTelegramTrade, learningStatus, pairPerformance, strategySettings, optimizer] = await Promise.all([
    fetchJson<Analytics>("/analytics", emptyAnalytics),
    fetchJson<TradeSignal[]>("/signals", []),
    fetchJson<TradeSignal[]>("/view-trades", []),
    fetchJson<TradeSignal | null>("/active-telegram-trade", null),
    fetchJson<TradeSignal | null>("/latest-telegram-trade", null),
    fetchJson<LearningStatus | null>("/learning-status", null),
    fetchJson<PairPerformanceState | null>("/pair-performance", null),
    fetchJson<StrategySettings | null>("/strategy-settings", null),
    fetchJson<OptimizerState | null>("/optimizer", null),
  ]);

  const telegramAnchor = activeTelegramTrade ?? latestTelegramTrade;
  const normalizedStrategySettings = strategySettings
    ? {
        ...strategySettings,
        enabled_pairs: strategySettings.enabled_pairs.length ? strategySettings.enabled_pairs : [...STRATEGY_PAIRS],
      }
    : null;
  const visibleSignals = telegramAnchor
    ? [
        telegramAnchor,
        ...signals.filter((signal) => signal.pair !== telegramAnchor.pair && signal.signal_id !== telegramAnchor.signal_id),
      ]
    : signals;

  return {
    analytics,
    signals: visibleSignals,
    trades,
    activeTelegramTrade,
    latestTelegramTrade,
    learningStatus,
    pairPerformance,
    strategySettings: normalizedStrategySettings,
    optimizer,
  };
}

export async function forceScan(): Promise<TradeSignal[]> {
  const payload = await fetchJson<{ signals: TradeSignal[] }>("/force-scan", { signals: [] }, { method: "POST" });
  return payload.signals;
}

export async function runTradeManager(): Promise<void> {
  await fetchJson("/run-trade-manager", {}, { method: "POST" });
}

export async function saveStrategySettings(settings: StrategySettings): Promise<StrategySettings | null> {
  return fetchJson<StrategySettings | null>("/strategy-settings", null, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
}

export async function resetState(): Promise<void> {
  await fetchJson("/reset-state", {}, { method: "POST" });
}

export async function applyOptimizer(): Promise<void> {
  await fetchJson("/optimizer/apply", {}, { method: "POST" });
}

export async function getDemoAccount(): Promise<DemoAccount | null> {
  return fetchJson<DemoAccount | null>("/demo-account", null);
}

export async function getDemoTrades(): Promise<DemoTrade[]> {
  return fetchJson<DemoTrade[]>("/demo-trades", []);
}

export async function createDemoTrade(payload: {
  pair: string;
  signal: "BUY" | "SELL";
  units: number;
  entry: number;
  sl: number;
  tp: number;
  rr: number;
  source_signal_id?: string;
}): Promise<void> {
  await fetchJson("/demo-trade", {}, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function resetDemoAccount(): Promise<void> {
  await fetchJson("/demo-reset", {}, { method: "POST" });
}
