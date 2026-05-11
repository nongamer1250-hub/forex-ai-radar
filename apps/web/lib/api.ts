import type {
  AccessKeyRecord,
  AdminState,
  Analytics,
  AuthSession,
  DashboardState,
  DemoAccount,
  DemoTrade,
  LearningStatus,
  OptimizerState,
  PairPerformanceState,
  StrategySettings,
  TelegramRecipient,
  TradeSignal,
  UserPreferences,
} from "@/lib/types";
import { AUTH_STORAGE_KEY, STRATEGY_PAIRS } from "@/lib/constants";

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
    const headers = new Headers(init?.headers);
    const token = typeof window === "undefined" ? "" : window.localStorage.getItem(AUTH_STORAGE_KEY) ?? "";
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const response = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store", ...init, headers });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export async function getDashboardState(): Promise<DashboardState> {
  const [analytics, signals, trades, activeTelegramTrade, latestTelegramTrade, learningStatus, pairPerformance, strategySettings, optimizer, preferences] = await Promise.all([
    fetchJson<Analytics>("/analytics", emptyAnalytics),
    fetchJson<TradeSignal[]>("/signals", []),
    fetchJson<TradeSignal[]>("/view-trades", []),
    fetchJson<TradeSignal | null>("/active-telegram-trade", null),
    fetchJson<TradeSignal | null>("/latest-telegram-trade", null),
    fetchJson<LearningStatus | null>("/learning-status", null),
    fetchJson<PairPerformanceState | null>("/pair-performance", null),
    fetchJson<StrategySettings | null>("/strategy-settings", null),
    fetchJson<OptimizerState | null>("/optimizer", null),
    fetchJson<UserPreferences | null>("/me/preferences", null),
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
    preferences,
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

export async function login(access_key: string, user_name: string): Promise<AuthSession | null> {
  const session = await fetchJson<AuthSession | null>("/auth/login", null, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_key, user_name }),
  });
  if (session?.session_token && typeof window !== "undefined") {
    window.localStorage.setItem(AUTH_STORAGE_KEY, session.session_token);
  }
  return session;
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  return fetchJson<AuthSession | null>("/auth/session", null);
}

export async function logout(): Promise<void> {
  await fetchJson("/auth/logout", {}, { method: "POST" });
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

export async function getAdminState(): Promise<AdminState | null> {
  return fetchJson<AdminState | null>("/admin/state", null);
}

export async function createUserAccessKey(label: string): Promise<{ created: AccessKeyRecord; state: AdminState } | null> {
  return fetchJson<{ created: AccessKeyRecord; state: AdminState } | null>("/admin/access-keys", null, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label }),
  });
}

export async function revokeUserAccessKey(key_id: string): Promise<AdminState | null> {
  return fetchJson<AdminState | null>("/admin/access-keys/revoke", null, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key_id }),
  });
}

export async function getTelegramRecipients(): Promise<TelegramRecipient[]> {
  return fetchJson<TelegramRecipient[]>("/telegram-recipients", []);
}

export async function addTelegramRecipient(chat_id: string): Promise<TelegramRecipient[]> {
  return fetchJson<TelegramRecipient[]>("/telegram-recipients", [], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id }),
  });
}

export async function removeTelegramRecipient(recipient_id: string): Promise<TelegramRecipient[]> {
  return fetchJson<TelegramRecipient[]>("/telegram-recipients/remove", [], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient_id }),
  });
}

export async function toggleTelegramRecipient(recipient_id: string, is_enabled: boolean): Promise<TelegramRecipient[]> {
  return fetchJson<TelegramRecipient[]>("/telegram-recipients/toggle", [], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient_id, is_enabled }),
  });
}

export async function saveUserPreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences | null> {
  return fetchJson<UserPreferences | null>("/me/preferences", null, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preferences),
  });
}
