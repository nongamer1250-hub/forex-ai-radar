"use client";

import { ChevronRight, Settings, SlidersHorizontal } from "lucide-react";
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
      subtitle="Tune your personal workspace, Telegram routing, and, if you are admin, the live signal engine controls."
      preferences={data?.preferences}
      actions={
        <>
          <MetricPill label="Role" value={session?.role === "ADMIN" ? "Operator" : "User"} />
          <MetricPill label="Recipients" value={String(recipients.length)} />
        </>
      }
    >
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.2fr)_420px]">
        <div className="grid gap-4">
          <TerminalSurface title="Workspace Profile" detail="Key scoped" icon={Settings}>
            <div className="grid gap-5">
              <div>
                <div className="mb-3 text-sm text-slate-400">Watchlist</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                  {STRATEGY_PAIRS.map((pair) => {
                    const enabled = preferences.watchlist.includes(pair);
                    return (
                      <button
                        className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                          enabled
                            ? "border-cyan-300/30 bg-cyan-300/[0.1] text-cyan-100"
                            : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/14"
                        }`}
                        key={pair}
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

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Default pair</label>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm"
                    onChange={(event) => setPreferences((current) => ({ ...current, selected_pair: event.target.value }))}
                    value={preferences.selected_pair}
                  >
                    {preferences.watchlist.map((pair) => (
                      <option key={pair} value={pair}>
                        {pair}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Density</label>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm"
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

              <label className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <div>
                  <div className="text-sm text-white">Telegram notifications</div>
                  <div className="mt-1 text-xs text-slate-500">Enable or mute delivery without deleting your saved destination.</div>
                </div>
                <input
                  checked={preferences.notifications_enabled}
                  className="accent-cyan-300"
                  onChange={(event) =>
                    setPreferences((current) => ({ ...current, notifications_enabled: event.target.checked }))
                  }
                  type="checkbox"
                />
              </label>

              <button
                className="rounded-2xl border border-cyan-300/25 bg-cyan-300/12 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-60"
                disabled={isPending || preferences.watchlist.length === 0}
                onClick={() => savePreferences(preferences)}
                type="button"
              >
                Save workspace profile
              </button>
            </div>
          </TerminalSurface>

          <TerminalSurface
            title="Telegram Delivery"
            detail={session?.role === "ADMIN" ? "Admin may manage many recipients" : "Users may keep one recipient"}
            icon={Settings}
          >
            <div className="grid gap-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm"
                  maxLength={32}
                  onChange={(event) => setRecipientInput(event.target.value)}
                  placeholder={session?.role === "ADMIN" ? "Add another Telegram chat id" : "Add your Telegram chat id"}
                  value={recipientInput}
                />
                <button
                  className="rounded-2xl border border-cyan-300/25 bg-cyan-300/12 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-60"
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

              <div className="grid gap-3">
                {recipients.map((recipient) => (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4" key={recipient.recipient_id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate font-mono text-sm text-white">{recipient.chat_id}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {recipient.is_enabled ? "Enabled for delivery" : "Muted"}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-slate-200 transition hover:bg-white/[0.08]"
                          onClick={() => {
                            void toggleTelegramRecipient(recipient.recipient_id, !recipient.is_enabled).then(setRecipients);
                          }}
                          type="button"
                        >
                          {recipient.is_enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          className="rounded-full border border-rose-300/25 bg-rose-300/12 px-3 py-2 text-xs text-rose-100 transition hover:bg-rose-300/20"
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

        <div className="grid content-start gap-4">
          <TerminalSurface title="Profile Snapshot" icon={Settings}>
            <div className="grid gap-3 sm:grid-cols-2">
              <DataChip label="Default Pair" value={preferences.selected_pair} />
              <DataChip label="Watchlist Size" value={String(preferences.watchlist.length)} />
              <DataChip label="Density" value={preferences.density_mode} />
              <DataChip label="Alerts" value={preferences.notifications_enabled ? "On" : "Off"} />
            </div>
          </TerminalSurface>

          {session?.role === "ADMIN" ? (
            <TerminalSurface title="Signal Engine Controls" detail="Admin only" icon={SlidersHorizontal}>
              <div className="grid gap-5">
                <div>
                  <div className="mb-3 text-sm text-slate-400">Enabled pairs</div>
                  <div className="grid grid-cols-2 gap-2">
                    {STRATEGY_PAIRS.map((pair) => {
                      const enabled = settings.enabled_pairs.includes(pair);
                      return (
                        <button
                          className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                            enabled
                              ? "border-cyan-300/30 bg-cyan-300/[0.1] text-cyan-100"
                              : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/14"
                          }`}
                          key={pair}
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
                  <div className="mb-3 text-sm text-slate-400">Enabled setups</div>
                  <div className="grid gap-2">
                    {STRATEGY_SETUPS.map((setup) => {
                      const enabled = settings.enabled_setups.includes(setup);
                      return (
                        <button
                          className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                            enabled
                              ? "border-emerald-300/30 bg-emerald-300/[0.1] text-emerald-100"
                              : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/14"
                          }`}
                          key={setup}
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
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
                    <span>Telegram minimum confidence</span>
                    <strong className="font-mono text-white">{Math.round(settings.min_confidence * 100)}%</strong>
                  </div>
                  <input
                    className="w-full accent-cyan-300"
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

                <label className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div>
                    <div className="text-sm text-white">Auto pair blocking</div>
                    <div className="mt-1 text-xs text-slate-500">Let the optimizer suppress weak pairs automatically.</div>
                  </div>
                  <input
                    checked={settings.auto_block_enabled}
                    className="accent-cyan-300"
                    onChange={(event) =>
                      setSettings((current) => ({ ...current, auto_block_enabled: event.target.checked }))
                    }
                    type="checkbox"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    className="rounded-2xl border border-cyan-300/25 bg-cyan-300/12 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-60"
                    disabled={isPending}
                    onClick={() => saveSettings(settings)}
                    type="button"
                  >
                    Save controls
                  </button>
                  <button
                    className="rounded-2xl border border-rose-300/25 bg-rose-300/12 px-4 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-300/20 disabled:opacity-60"
                    disabled={isPending}
                    onClick={hardReset}
                    type="button"
                  >
                    Hard reset
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <DataChip label="Auto Blocked" value={data?.optimizer?.auto_blocked_pairs.join(", ") || "None"} />
                  <DataChip label="Min Confidence" value={formatNumber(settings.min_confidence * 100, "%")} />
                  <DataChip label="Recommended On" value={String(data?.optimizer?.recommended_enabled_pairs.length ?? 0)} />
                  <DataChip label="Recommended Off" value={String(data?.optimizer?.recommended_disabled_pairs.length ?? 0)} />
                </div>

                <button
                  className="inline-flex items-center justify-between rounded-2xl border border-amber-300/25 bg-amber-300/12 px-4 py-3 text-sm font-medium text-amber-100 transition hover:bg-amber-300/20 disabled:opacity-60"
                  disabled={isPending}
                  onClick={applyOptimizerNow}
                  type="button"
                >
                  <span>Apply optimizer recommendations</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </TerminalSurface>
          ) : null}
        </div>
      </div>
    </TerminalShell>
  );
}
