export type SignalAction = "BUY" | "SELL" | "WAIT";
export type TradeStatus = "OPEN" | "WIN" | "LOSS" | "WAIT";

export interface TradeSignal {
  signal_id: string;
  pair: string;
  signal: SignalAction;
  setup_quality: string;
  setup_score: number;
  confidence: number;
  rr: number;
  entry: number;
  sl: number;
  tp: number;
  timestamp: string;
  trade_status: TradeStatus;
  session: string;
  trend_bias: string;
  candle_strength: number;
  rsi: number;
  atr: number;
  ema_fast: number;
  ema_slow: number;
  setup_type?: string;
  learning_bias?: number;
  source: string;
  closed_at?: string | null;
  close_price?: number | null;
}

export interface Analytics {
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  active_trades: number;
  avg_rr: number;
  best_pair: string;
  profit_factor: number;
}

export interface LearningStatus {
  closed_trades_used: number;
  wins: number;
  losses: number;
  net_outcome_score: number;
  strongest_pair: string;
  strongest_setup: string;
}

export interface StrategySettings {
  enabled_pairs: string[];
  enabled_setups: string[];
  min_confidence: number;
  auto_block_enabled: boolean;
  telegram_chat_ids: string[];
}

export interface PairPerformanceRow {
  pair: string;
  enabled: boolean;
  total_logs: number;
  finished_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  buy_signals: number;
  sell_signals: number;
  waits: number;
  avg_learning_bias: number;
  avg_confidence: number;
}

export interface SetupPerformanceRow {
  setup_type: string;
  enabled: boolean;
  samples: number;
  finished_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
}

export interface PairPerformanceState {
  pairs: PairPerformanceRow[];
  setups: SetupPerformanceRow[];
  settings: StrategySettings;
}

export interface OptimizerRecommendation {
  pair: string;
  action: string;
  reason: string;
  finished_trades?: number;
  win_rate?: number;
}

export interface OptimizerState {
  settings: StrategySettings;
  auto_blocked_pairs: string[];
  recommended_enabled_pairs: string[];
  recommended_disabled_pairs: string[];
  recommendations: OptimizerRecommendation[];
}

export interface DashboardState {
  analytics: Analytics;
  signals: TradeSignal[];
  trades: TradeSignal[];
  activeTelegramTrade: TradeSignal | null;
  latestTelegramTrade: TradeSignal | null;
  learningStatus: LearningStatus | null;
  pairPerformance: PairPerformanceState | null;
  strategySettings: StrategySettings | null;
  optimizer: OptimizerState | null;
  preferences: UserPreferences | null;
}

export interface DemoTrade {
  demo_trade_id: string;
  pair: string;
  signal: "BUY" | "SELL";
  units: number;
  entry: number;
  sl: number;
  tp: number;
  rr: number;
  status: "OPEN" | "WIN" | "LOSS";
  opened_at: string;
  closed_at?: string | null;
  close_price?: number | null;
  realized_pnl?: number | null;
  source_signal_id?: string | null;
  current_price?: number;
  unrealized_pnl?: number;
}

export interface DemoAccount {
  account_id: string;
  start_balance: number;
  balance: number;
  equity: number;
  open_positions: number;
  unrealized_pnl: number;
  updated_at: string;
  positions: DemoTrade[];
}

export interface AuthSession {
  session_token: string;
  role: "ADMIN" | "USER";
  user_name: string;
  label: string;
  expires_at: string;
}

export interface AccessKeyRecord {
  key_id: string;
  access_key: string;
  role: "ADMIN" | "USER";
  label: string;
  assigned_user?: string | null;
  status: string;
  created_at: string;
  redeemed_at?: string | null;
}

export interface AdminSessionRecord {
  session_token: string;
  key_id: string;
  role: string;
  user_name: string;
  created_at: string;
  last_seen_at: string;
  expires_at?: string | null;
  revoked_at?: string | null;
}

export interface AdminState {
  admin_key_configured: boolean;
  generated_keys: AccessKeyRecord[];
  active_sessions: AdminSessionRecord[];
}

export interface TelegramRecipient {
  recipient_id: string;
  owner_key_id: string;
  owner_role: "ADMIN" | "USER";
  chat_id: string;
  is_enabled: boolean;
  created_at: string;
}

export interface UserPreferences {
  watchlist: string[];
  selected_pair: string;
  density_mode: "compact" | "comfortable";
  notifications_enabled: boolean;
  updated_at: string;
}
