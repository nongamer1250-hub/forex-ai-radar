"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { applyOptimizer, createDemoTrade, forceScan, getDashboardState, getDemoAccount, getDemoTrades, resetDemoAccount, resetState, runTradeManager, saveStrategySettings, saveUserPreferences } from "@/lib/api";
import type { DashboardState, DemoAccount, DemoTrade, StrategySettings, UserPreferences } from "@/lib/types";

export function useDashboardData() {
  const [data, setData] = useState<DashboardState | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    const next = await getDashboardState();
    setData(next);
    return next;
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      void runTradeManager().then(refresh);
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  return {
    data,
    isPending,
    refresh,
    forceScanNow() {
      startTransition(() => {
        void forceScan().then(refresh);
      });
    },
    saveSettings(settings: StrategySettings) {
      startTransition(() => {
        void saveStrategySettings(settings).then(refresh);
      });
    },
    applyOptimizerNow() {
      startTransition(() => {
        void applyOptimizer().then(refresh);
      });
    },
    hardReset() {
      startTransition(() => {
        void resetState().then(refresh);
      });
    },
    savePreferences(preferences: Partial<UserPreferences>) {
      startTransition(() => {
        void saveUserPreferences(preferences).then(refresh);
      });
    },
  };
}

export function useDemoData() {
  const [account, setAccount] = useState<DemoAccount | null>(null);
  const [trades, setTrades] = useState<DemoTrade[]>([]);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    const [nextAccount, nextTrades] = await Promise.all([getDemoAccount(), getDemoTrades()]);
    setAccount(nextAccount);
    setTrades(nextTrades);
    return { nextAccount, nextTrades };
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  return {
    account,
    trades,
    isPending,
    refresh,
    submitTrade(payload: {
      pair: string;
      signal: "BUY" | "SELL";
      units: number;
      entry: number;
      sl: number;
      tp: number;
      rr: number;
      source_signal_id?: string;
    }) {
      startTransition(() => {
        void createDemoTrade(payload).then(refresh);
      });
    },
    resetAccount() {
      startTransition(() => {
        void resetDemoAccount().then(refresh);
      });
    },
  };
}
