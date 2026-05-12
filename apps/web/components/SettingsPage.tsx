"use client";

import { Bell, ChevronRight, Settings, Shield, SlidersHorizontal, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import {
  DataChip,
  MetricPill,
  TerminalShell,
  TerminalSurface,
  formatNumber,
} from "@/components/terminal-ui";
import { useAuth } from "@/components/use-auth";
import { useDashboardData } from "@/components/use-live-data";
import { addTelegramRecipient, getTelegramRecipients, removeTelegramRecipient, toggleTelegramRecipient } from "@/lib/api";
import { STRATEGY_PAIRS, STRATEGY_SETUPS } from "@/lib/constants";
import type { StrategySettings, TelegramRecipient, UserPreferences } from "@/lib/types";

const defaultSettings: StrategySettings = {
  enabled_pairs: [...STRATEGY_PAIRS],
  enabled_setups: [...STRATEGY_SETUPS],
  min_confidence: 0.6,
  auto_block_enabled: true,
  telegram_chat_ids: [],
};

export function SettingsPage() {
  const { session } = useAuth();
  const { data, saveSettings, applyOptimizerNow, hardReset, isPending, savePreferences } = useDashboardData();
  const [settings, setSettings] = useState<StrategySettings>(defaultSettings);
  const [recipientInput, setRecipientInput] = useState("");
  const [recipients, setRecipients] = useState<TelegramRecipient[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({
    watchlist: [...STRATEGY_PAIRS.slice(0, 4)],
    selected_pair: "EURUSD",
    density_mode: "compact",
    notifications_enabled: true,
    demo_auto_trade_enabled: false,
    demo_auto_trade_units: 10000,
    updated_at: "",
  });

  useEffect(() => {
    if (data?.strategySettings) {
      setSettings(data.strategySettings);
    }
  }, [data?.strategySettings]);

  useEffect(() => {
    if (data?.preferences) {
      setPreferences(data.preferences);
    }
  }, [data?.preferences]);

  useEffect(() => {
    void getTelegramRecipients().then(setRecipients);
  }, []);

  return (
    <TerminalShell
      title="Settings"
      subtitle="Configure your workspace preferences, notification routing, and platform controls."
      preferences={data?.preferences}
      actions={
        <>
          <MetricPill label="Role" value={session?.role === "ADMIN" ? "Operator" : "User"} />
          <MetricPill label="Recipients" value={String(recipients.length)} />
        </>
      }
    >
      <div className="grid gap-4 2xl:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          {/* Workspace Profile */}
          <TerminalSurface title="Workspace Profile" detail="Key scoped" icon={UserRound}>
            <div className="space-y-6">
              {/* Watchlist */}
              <div>
                <div className="mb-3 text-sm font-medium text-zinc-300">Watchlist</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {STRATEGY_PAIRS.map((pair) => {
                    const enabled = preferences.watchlist.includes(pair);
                    return (
                      <button
                        key={pair}
                        className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                          enabled
                            ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                            : "border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:border-zinc-700"
                        }`}
                        onClick={() =>
                          setPreferences((current) => {
                            const nextWatchlist = enabled
                              ? current.watchlist.filter((item) => item !== pair)
                              : [...current.watchlist, pair];
                            return {
                              ...current,
                              watchlist: nextWatchlist,
                              selected_pair: nextWatchlist.includes(current.selected_pair)
                                ? current.selected_pair
                                : (nextWatchlist[0] ?? current.selected_pair),
                            };
                          })
                        }
                        type="button"
                      >
                        {pair}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selects */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Default pair</label>
                  <select
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-100"
                    onChange={(event) => setPreferences((current) => ({ ...current, selected_pair: event.target.value }))}
                    value={preferences.selected_pair}
                  >
                    {preferences.watchlist.map((pair) => (
                      <option key={pair} value={pair}>{pair}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Density</label>
                  <select
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-100"
                    onChange={(event) =>
                      setPreferences((current) => ({
                        ...current,
                        density_mode: event.target.value as "compact" | "comfortable",
                      }))
                    }
                    value={preferences.density_mode}
                  >
                    <option value="compact">Compact</option>
                    <option value="comfortable">Comfortable</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <label className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-800/30 p-4 cursor-pointer">
                <div>
                  <div className="text-sm font-medium text-zinc-200">Telegram notifications</div>
                  <div className="mt-1 text-xs text-zinc-500">Enable or mute delivery.</div>
                </div>
                <input
                  checked={preferences.notifications_enabled}
                  className="size-5 accent-cyan-500"
                  onChange={(event) =>
                    setPreferences((current) => ({ ...current, notifications_enabled: event.target.checked }))
                  }
                  type="checkbox"
                />
              </label>

              <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-zinc-200">Auto demo trading</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Let the demo account pick the best live signal automatically.
                    </div>
                  </div>
                  <input
                    checked={preferences.demo_auto_trade_enabled}
                    className="size-5 accent-cyan-500"
                    onChange={(event) =>
                      setPreferences((current) => ({ ...current, demo_auto_trade_enabled: event.target.checked }))
                    }
                    type="checkbox"
                  />
                </div>
                <div className="mt-4">
                  <label className="mb-2 block text-sm text-zinc-400">Auto demo units</label>
                  <input
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-100"
                    min={100}
                    onChange={(event) =>
                      setPreferences((current) => ({
                        ...current,
                        demo_auto_trade_units: Math.max(100, Number(event.target.value) || 100),
                      }))
                    }
                    step={100}
                    type="number"
                    value={preferences.demo_auto_trade_units}
                  />
                </div>
              </div>

              <button
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-3 text-sm font-semibold text-zinc-900 shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/30 disabled:opacity-50"
                disabled={isPending || preferences.watchlist.length === 0}
                onClick={() => savePreferences(preferences)}
                type="button"
              >
                Save workspace profile
              </button>
            </div>
          </TerminalSurface>

          {/* Telegram Delivery */}
          <TerminalSurface
            title="Telegram Delivery"
            detail={session?.role === "ADMIN" ? "Admin can manage multiple" : "One recipient"}
            icon={Bell}
          >
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500"
                  maxLength={32}
                  onChange={(event) => setRecipientInput(event.target.value)}
                  placeholder={session?.role === "ADMIN" ? "Add another chat ID" : "Add your chat ID"}
                  value={recipientInput}
                />
                <button
                  className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-400 transition-all hover:bg-cyan-500/20 disabled:opacity-50"
                  disabled={!recipientInput.trim() || (session?.role !== "ADMIN" && recipients.length >= 1)}
                  onClick={() => {
                    void addTelegramRecipient(recipientInput).then((next) => {
                      setRecipients(next);
                      setRecipientInput("");
                    });
                  }}
                  type="button"
                >
                  Add recipient
                </button>
              </div>

              <div className="space-y-3">
                {recipients.map((recipient) => (
                  <div key={recipient.recipient_id} className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-mono text-sm text-zinc-100">{recipient.chat_id}</div>
                        <div className="mt-1 text-xs text-zinc-500">
                          {recipient.is_enabled ? "Enabled" : "Muted"}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-xs text-zinc-300 transition-colors hover:bg-zinc-700"
                          onClick={() => {
                            void toggleTelegramRecipient(recipient.recipient_id, !recipient.is_enabled).then(setRecipients);
                          }}
                          type="button"
                        >
                          {recipient.is_enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400 transition-colors hover:bg-rose-500/20"
                          onClick={() => {
                            void removeTelegramRecipient(recipient.recipient_id).then(setRecipients);
                          }}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TerminalSurface>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <TerminalSurface title="Profile Snapshot" icon={Shield}>
            <div className="grid grid-cols-2 gap-3">
              <DataChip label="Default Pair" value={preferences.selected_pair} />
              <DataChip label="Watchlist" value={String(preferences.watchlist.length)} />
              <DataChip label="Density" value={preferences.density_mode} />
              <DataChip label="Alerts" value={preferences.notifications_enabled ? "On" : "Off"} />
              <DataChip label="Auto Demo" value={preferences.demo_auto_trade_enabled ? "On" : "Off"} />
              <DataChip label="Demo Units" value={String(preferences.demo_auto_trade_units)} />
            </div>
          </TerminalSurface>

          {/* Admin Controls */}
          {session?.role === "ADMIN" && (
            <TerminalSurface title="Engine Controls" detail="Admin only" icon={SlidersHorizontal}>
              <div className="space-y-5">
                <div>
                  <div className="mb-3 text-sm text-zinc-400">Enabled pairs</div>
                  <div className="grid grid-cols-2 gap-2">
                    {STRATEGY_PAIRS.map((pair) => {
                      const enabled = settings.enabled_pairs.includes(pair);
                      return (
                        <button
                          key={pair}
                          className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                            enabled
                              ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                              : "border-zinc-800 bg-zinc-800/40 text-zinc-500 hover:border-zinc-700"
                          }`}
                          onClick={() =>
                            setSettings((current) => ({
                              ...current,
                              enabled_pairs: enabled
                                ? current.enabled_pairs.filter((item) => item !== pair)
                                : [...current.enabled_pairs, pair],
                            }))
                          }
                          type="button"
                        >
                          {pair}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-sm text-zinc-400">Enabled setups</div>
                  <div className="space-y-2">
                    {STRATEGY_SETUPS.map((setup) => {
                      const enabled = settings.enabled_setups.includes(setup);
                      return (
                        <button
                          key={setup}
                          className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                            enabled
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : "border-zinc-800 bg-zinc-800/40 text-zinc-500 hover:border-zinc-700"
                          }`}
                          onClick={() =>
                            setSettings((current) => ({
                              ...current,
                              enabled_setups: enabled
                                ? current.enabled_setups.filter((item) => item !== setup)
                                : [...current.enabled_setups, setup],
                            }))
                          }
                          type="button"
                        >
                          {setup}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Min confidence</span>
                    <span className="font-mono text-zinc-200">{Math.round(settings.min_confidence * 100)}%</span>
                  </div>
                  <input
                    className="w-full accent-cyan-500"
                    max={0.9}
                    min={0.4}
                    onChange={(event) =>
                      setSettings((current) => ({ ...current, min_confidence: Number(event.target.value) }))
                    }
                    step={0.01}
                    type="range"
                    value={settings.min_confidence}
                  />
                </div>

                <label className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-800/30 p-4 cursor-pointer">
                  <div>
                    <div className="text-sm font-medium text-zinc-200">Auto pair blocking</div>
                    <div className="mt-1 text-xs text-zinc-500">Suppress weak pairs automatically.</div>
                  </div>
                  <input
                    checked={settings.auto_block_enabled}
                    className="size-5 accent-cyan-500"
                    onChange={(event) =>
                      setSettings((current) => ({ ...current, auto_block_enabled: event.target.checked }))
                    }
                    type="checkbox"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    className="rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-3 text-sm font-semibold text-zinc-900 disabled:opacity-50"
                    disabled={isPending}
                    onClick={() => saveSettings(settings)}
                    type="button"
                  >
                    Save controls
                  </button>
                  <button
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-400 disabled:opacity-50"
                    disabled={isPending}
                    onClick={hardReset}
                    type="button"
                  >
                    Hard reset
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <DataChip label="Auto Blocked" value={data?.optimizer?.auto_blocked_pairs.join(", ") || "None"} />
                  <DataChip label="Min Conf" value={formatNumber(settings.min_confidence * 100, "%")} />
                </div>

                <button
                  className="flex w-full items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-400 transition-all hover:bg-amber-500/20 disabled:opacity-50"
                  disabled={isPending}
                  onClick={applyOptimizerNow}
                  type="button"
                >
                  <span>Apply optimizer recommendations</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </TerminalSurface>
          )}
        </div>
      </div>
    </TerminalShell>
  );
}
