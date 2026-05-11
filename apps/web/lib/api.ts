import type { Analytics, DashboardState, LearningStatus, TradeSignal } from "@/lib/types";

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
  const [analytics, signals, trades, activeTelegramTrade, latestTelegramTrade, learningStatus] = await Promise.all([
    fetchJson<Analytics>("/analytics", emptyAnalytics),
    fetchJson<TradeSignal[]>("/signals", []),
    fetchJson<TradeSignal[]>("/view-trades", []),
    fetchJson<TradeSignal | null>("/active-telegram-trade", null),
    fetchJson<TradeSignal | null>("/latest-telegram-trade", null),
    fetchJson<LearningStatus | null>("/learning-status", null),
  ]);

  const telegramAnchor = activeTelegramTrade ?? latestTelegramTrade;
  const visibleSignals = telegramAnchor
    ? [
        telegramAnchor,
        ...signals.filter((signal) => signal.pair !== telegramAnchor.pair && signal.signal_id !== telegramAnchor.signal_id),
      ]
    : signals;

  return { analytics, signals: visibleSignals, trades, activeTelegramTrade, latestTelegramTrade, learningStatus };
}

export async function forceScan(): Promise<TradeSignal[]> {
  const payload = await fetchJson<{ signals: TradeSignal[] }>("/force-scan", { signals: [] }, { method: "POST" });
  return payload.signals;
}

export async function runTradeManager(): Promise<void> {
  await fetchJson("/run-trade-manager", {}, { method: "POST" });
}
