"use client";

import { Bell, ChevronRight, Shield, SlidersHorizontal, UserRound } from "lucide-react";
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
    if (data?.strategySettings) setSettings(data.strategySettings);
  }, [data?.strategySettings]);

  useEffect(() => {
    if (data?.preferences) setPreferences(data.preferences);
  }, [data?.preferences]);

  useEffect(() => {
    void getTelegramRecipients().then(setRecipients);
  }, []);

  return (
    <TerminalShell
      title="Settings"
      subtitle="Configure workspace, notifications, and platform controls."
      preferences={data?.preferences}
      actions={
        <>
          <MetricPill label="" value={session?.role === "ADMIN" ? "Operator" : "User"} />
          <MetricPill label="Recipients" value={String(recipients.length)} />
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {/* Workspace Profile */}
          <TerminalSurface title="Workspace" detail="Key scoped" icon={UserRound}>
            <div className="space-y-5">
              {/* Watchlist */}
              <div>
                <div className="mb-2.5 text-xs font-semibold text-foreground">Watchlist</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {STRATEGY_PAIRS.map((pair) => {
                    const enabled = preferences.watchlist.includes(pair);
                    return (
                      <button
                        key={pair}
                        className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                          enabled
                            ? "border-brand/40 bg-brand-muted text-brand"
                            : "border-border bg-secondary text-muted-foreground hover:border-border hover:bg-secondary/80"
                        }`}
                        onClick={() =>
                          setPreferences((c) => {
                            const next = enabled ? c.watchlist.filter((i) => i !== pair) : [...c.watchlist, pair];
                            return { ...c, watchlist: next, selected_pair: next.includes(c.selected_pair) ? c.selected_pair : (next[0] ?? c.selected_pair) };
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
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Default pair</label>
                  <select
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground"
                    onChange={(e) => setPreferences((c) => ({ ...c, selected_pair: e.target.value }))}
                    value={preferences.selected_pair}
                  >
                    {preferences.watchlist.map((pair) => (
                      <option key={pair} value={pair}>{pair}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Density</label>
                  <select
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground"
                    onChange={(e) => setPreferences((c) => ({ ...c, density_mode: e.target.value as "compact" | "comfortable" }))}
                    value={preferences.density_mode}
                  >
                    <option value="compact">Compact</option>
                    <option value="comfortable">Comfortable</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-secondary/50 p-3.5">
                <div>
                  <div className="text-sm font-medium text-foreground">Telegram notifications</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">Enable or mute delivery.</div>
                </div>
                <input
                  checked={preferences.notifications_enabled}
                  className="size-4 accent-brand"
                  onChange={(e) => setPreferences((c) => ({ ...c, notifications_enabled: e.target.checked }))}
                  type="checkbox"
                />
              </label>

              <div className="rounded-lg border border-border bg-secondary/50 p-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-foreground">Auto demo trading</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">Let demo pick best signal automatically.</div>
                  </div>
                  <input
                    checked={preferences.demo_auto_trade_enabled}
                    className="size-4 accent-brand"
                    onChange={(e) => setPreferences((c) => ({ ...c, demo_auto_trade_enabled: e.target.checked }))}
                    type="checkbox"
                  />
                </div>
                <div className="mt-3">
                  <label className="mb-1.5 block text-xs text-muted-foreground">Auto demo units</label>
                  <input
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground"
                    min={100}
                    onChange={(e) => setPreferences((c) => ({ ...c, demo_auto_trade_units: Math.max(100, Number(e.target.value) || 100) }))}
                    step={100}
                    type="number"
                    value={preferences.demo_auto_trade_units}
                  />
                </div>
              </div>

              <button
                className="btn-primary w-full rounded-lg px-4 py-2.5 text-sm disabled:opacity-50"
                disabled={isPending || preferences.watchlist.length === 0}
                onClick={() => savePreferences(preferences)}
                type="button"
              >
                Save workspace profile
              </button>
            </div>
          </TerminalSurface>

          {/* Telegram */}
          <TerminalSurface title="Telegram Delivery" detail={session?.role === "ADMIN" ? "Admin" : "1 recipient"} icon={Bell}>
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground"
                  maxLength={32}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  placeholder={session?.role === "ADMIN" ? "Add chat ID" : "Add your chat ID"}
                  value={recipientInput}
                />
                <button
                  className="rounded-lg border border-brand/30 bg-brand-muted px-4 py-2.5 text-sm font-medium text-brand transition-all hover:bg-brand/20 disabled:opacity-50"
                  disabled={!recipientInput.trim() || (session?.role !== "ADMIN" && recipients.length >= 1)}
                  onClick={() => { void addTelegramRecipient(recipientInput).then((n) => { setRecipients(n); setRecipientInput(""); }); }}
                  type="button"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2.5">
                {recipients.map((r) => (
                  <div key={r.recipient_id} className="flex flex-col gap-2.5 rounded-lg border border-border bg-secondary/50 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-mono text-sm text-foreground">{r.chat_id}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{r.is_enabled ? "Enabled" : "Muted"}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary/80"
                        onClick={() => { void toggleTelegramRecipient(r.recipient_id, !r.is_enabled).then(setRecipients); }}
                        type="button"
                      >
                        {r.is_enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        className="rounded-lg border border-danger/30 bg-danger-muted px-3 py-1.5 text-xs text-danger transition-colors hover:bg-danger/20"
                        onClick={() => { void removeTelegramRecipient(r.recipient_id).then(setRecipients); }}
                        type="button"
                      >
                        Remove
                      </button>
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
            <div className="grid grid-cols-2 gap-2">
              <DataChip label="Default" value={preferences.selected_pair} />
              <DataChip label="Watchlist" value={String(preferences.watchlist.length)} />
              <DataChip label="Density" value={preferences.density_mode} />
              <DataChip label="Alerts" value={preferences.notifications_enabled ? "On" : "Off"} />
              <DataChip label="Auto Demo" value={preferences.demo_auto_trade_enabled ? "On" : "Off"} />
              <DataChip label="Units" value={String(preferences.demo_auto_trade_units)} />
            </div>
          </TerminalSurface>

          {/* Admin Controls */}
          {session?.role === "ADMIN" && (
            <TerminalSurface title="Engine Controls" detail="Admin" icon={SlidersHorizontal}>
              <div className="space-y-4">
                <div>
                  <div className="mb-2.5 text-xs font-semibold text-foreground">Enabled pairs</div>
                  <div className="grid grid-cols-2 gap-2">
                    {STRATEGY_PAIRS.map((pair) => {
                      const enabled = settings.enabled_pairs.includes(pair);
                      return (
                        <button
                          key={pair}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                            enabled
                              ? "border-brand/40 bg-brand-muted text-brand"
                              : "border-border bg-secondary text-muted-foreground hover:bg-secondary/80"
                          }`}
                          onClick={() =>
                            setSettings((c) => ({
                              ...c,
                              enabled_pairs: enabled ? c.enabled_pairs.filter((i) => i !== pair) : [...c.enabled_pairs, pair],
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
                  <div className="mb-2.5 text-xs font-semibold text-foreground">Setups</div>
                  <div className="space-y-2">
                    {STRATEGY_SETUPS.map((setup) => {
                      const enabled = settings.enabled_setups.includes(setup);
                      return (
                        <button
                          key={setup}
                          className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-all ${
                            enabled
                              ? "border-success/30 bg-success-muted text-success"
                              : "border-border bg-secondary text-muted-foreground hover:bg-secondary/80"
                          }`}
                          onClick={() =>
                            setSettings((c) => ({
                              ...c,
                              enabled_setups: enabled ? c.enabled_setups.filter((i) => i !== setup) : [...c.enabled_setups, setup],
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
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">Min confidence</span>
                    <span className="font-mono text-muted-foreground">{Math.round(settings.min_confidence * 100)}%</span>
                  </div>
                  <input
                    className="w-full accent-brand"
                    max={0.9}
                    min={0.4}
                    onChange={(e) => setSettings((c) => ({ ...c, min_confidence: Number(e.target.value) }))}
                    step={0.01}
                    type="range"
                    value={settings.min_confidence}
                  />
                </div>

                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-secondary/50 p-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">Auto blocking</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">Suppress weak pairs.</div>
                  </div>
                  <input
                    checked={settings.auto_block_enabled}
                    className="size-4 accent-brand"
                    onChange={(e) => setSettings((c) => ({ ...c, auto_block_enabled: e.target.checked }))}
                    type="checkbox"
                  />
                </label>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    className="btn-primary rounded-lg px-4 py-2.5 text-sm disabled:opacity-50"
                    disabled={isPending}
                    onClick={() => saveSettings(settings)}
                    type="button"
                  >
                    Save controls
                  </button>
                  <button
                    className="rounded-lg border border-danger/30 bg-danger-muted px-4 py-2.5 text-sm font-medium text-danger disabled:opacity-50"
                    disabled={isPending}
                    onClick={hardReset}
                    type="button"
                  >
                    Hard reset
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <DataChip label="Blocked" value={data?.optimizer?.auto_blocked_pairs.join(", ") || "None"} />
                  <DataChip label="Min Conf" value={formatNumber(settings.min_confidence * 100, "%")} />
                </div>

                <button
                  className="flex w-full items-center justify-between rounded-lg border border-warning/30 bg-warning-muted px-4 py-2.5 text-sm font-medium text-warning transition-all hover:bg-warning/20 disabled:opacity-50"
                  disabled={isPending}
                  onClick={applyOptimizerNow}
                  type="button"
                >
                  <span>Apply optimizer</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </TerminalSurface>
          )}
        </div>
      </div>
    </TerminalShell>
  );
}
