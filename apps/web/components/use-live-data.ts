"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { applyOptimizer, autoDemoTrade, createDemoTrade, forceScan, getDashboardState, getDemoAccount, getDemoTrades, resetDemoAccount, resetState, runTradeManager, saveStrategySettings, saveUserPreferences } from "@/lib/api";
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

  const forceScanNow = useCallback(() => {
    startTransition(() => {
      void forceScan().then(refresh);
    });
  }, [refresh]);

  const saveSettings = useCallback((settings: StrategySettings) => {
    startTransition(() => {
      void saveStrategySettings(settings).then(refresh);
    });
  }, [refresh]);

  const applyOptimizerNow = useCallback(() => {
    startTransition(() => {
      void applyOptimizer().then(refresh);
    });
  }, [refresh]);

  const hardReset = useCallback(() => {
    startTransition(() => {
      void resetState().then(refresh);
    });
  }, [refresh]);

  const savePreferences = useCallback((preferences: Partial<UserPreferences>) => {
    startTransition(() => {
      void saveUserPreferences(preferences).then(refresh);
    });
  }, [refresh]);

  return useMemo(
    () => ({
      data,
      isPending,
      refresh,
      forceScanNow,
      saveSettings,
      applyOptimizerNow,
      hardReset,
      savePreferences,
    }),
    [applyOptimizerNow, data, forceScanNow, hardReset, isPending, refresh, savePreferences, saveSettings],
  );
}

export function useDemoData() {
  const [account, setAccount] = useState<DemoAccount | null>(null);
  const [trades, setTrades] = useState<DemoTrade[]>([]);
  const [autoTradeStatus, setAutoTradeStatus] = useState<string>("");
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

  const submitTrade = useCallback((payload: {
    pair: string;
    signal: "BUY" | "SELL";
    units: number;
    entry: number;
    sl: number;
    tp: number;
    rr: number;
    source_signal_id?: string;
  }) => {
    startTransition(() => {
      void createDemoTrade(payload).then(refresh);
    });
  }, [refresh]);

  const resetAccount = useCallback(() => {
    startTransition(() => {
      void resetDemoAccount().then(refresh);
    });
  }, [refresh]);

  const runAutoTrade = useCallback(() => {
    startTransition(() => {
      void autoDemoTrade().then(async (result) => {
        setAutoTradeStatus(result?.status ?? "");
        await refresh();
      });
    });
  }, [refresh]);

  return useMemo(
    () => ({
      account,
      trades,
      autoTradeStatus,
      isPending,
      refresh,
      submitTrade,
      resetAccount,
      runAutoTrade,
    }),
    [account, autoTradeStatus, isPending, refresh, resetAccount, runAutoTrade, submitTrade, trades],
  );
}
