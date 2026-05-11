"use client";

import { ChevronRight, Settings, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

import { MetricPill, SectionHeader, TerminalShell, panelClassName } from "@/components/terminal-ui";
import { useAuth } from "@/components/use-auth";
import { addTelegramRecipient, getTelegramRecipients, removeTelegramRecipient } from "@/lib/api";
import { useDashboardData } from "@/components/use-live-data";
import { STRATEGY_PAIRS, STRATEGY_SETUPS } from "@/lib/constants";
import type { StrategySettings, TelegramRecipient } from "@/lib/types";

const defaultSettings: StrategySettings = {
  enabled_pairs: [...STRATEGY_PAIRS],
  enabled_setups: [...STRATEGY_SETUPS],
  min_confidence: 0.6,
  auto_block_enabled: true,
  telegram_chat_ids: [],
};

export function SettingsPage() {
  const { session } = useAuth();
  const { data, saveSettings, applyOptimizerNow, hardReset, isPending } = useDashboardData();
  const [settings, setSettings] = useState<StrategySettings>(defaultSettings);
  const [recipientInput, setRecipientInput] = useState("");
  const [recipients, setRecipients] = useState<TelegramRecipient[]>([]);

  useEffect(() => {
    if (!data?.strategySettings) {
      return;
    }
    setSettings(data.strategySettings);
  }, [data?.strategySettings]);

  useEffect(() => {
    void getTelegramRecipients().then(setRecipients);
  }, []);

  return (
    <TerminalShell
      title="Settings"
      subtitle="Control live pair routing, Telegram recipients, optimizer rules, and reset operations."
      actions={
        <>
          <MetricPill label="Mode" value={session?.role === "ADMIN" ? "Operator" : "Read only"} />
          <MetricPill label="TG Slots" value={String(recipients.length)} />
        </>
      }
    >
      <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className={`${panelClassName()} rounded-lg p-3`}>
          <SectionHeader title="Strategy Controls" detail="Live" icon={Settings} />
          <div className="grid gap-4 text-sm">
            <div>
              <div className="mb-2 text-slate-500">Enabled pairs</div>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {STRATEGY_PAIRS.map((pair) => {
                  const enabled = settings.enabled_pairs.includes(pair);
                  return (
                    <button
                      className={`rounded-lg border px-2 py-2 text-left transition ${enabled ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100" : "border-white/8 bg-white/[0.03] text-slate-400 hover:border-white/15"}`}
                      disabled={session?.role !== "ADMIN"}
                      key={pair}
                      onClick={() =>
                        setSettings((current) => ({
                          ...current,
                          enabled_pairs: enabled ? current.enabled_pairs.filter((item) => item !== pair) : [...current.enabled_pairs, pair],
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
              <div className="mb-2 text-slate-500">Enabled setups</div>
              <div className="grid gap-2">
                {STRATEGY_SETUPS.map((setup) => {
                  const enabled = settings.enabled_setups.includes(setup);
                  return (
                    <button
                      className={`rounded-lg border px-2 py-2 text-left transition ${enabled ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100" : "border-white/8 bg-white/[0.03] text-slate-400 hover:border-white/15"}`}
                      disabled={session?.role !== "ADMIN"}
                      key={setup}
                      onClick={() =>
                        setSettings((current) => ({
                          ...current,
                          enabled_setups: enabled ? current.enabled_setups.filter((item) => item !== setup) : [...current.enabled_setups, setup],
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
              <div className="mb-2 flex items-center justify-between text-slate-500">
                <span>Telegram min confidence</span>
                <strong className="font-mono text-white">{Math.round(settings.min_confidence * 100)}%</strong>
              </div>
              <input
                className="w-full accent-cyan-300"
                disabled={session?.role !== "ADMIN"}
                max={0.9}
                min={0.4}
                onChange={(event) => setSettings((current) => ({ ...current, min_confidence: Number(event.target.value) }))}
                step={0.01}
                type="range"
                value={settings.min_confidence}
              />
            </div>

            <div>
              <label className="mb-2 block text-slate-500">{session?.role === "ADMIN" ? "Telegram chat ids" : "Telegram chat id"}</label>
              <div className="flex gap-2">
                <input
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2"
                  maxLength={32}
                  onChange={(event) => setRecipientInput(event.target.value)}
                  placeholder={session?.role === "ADMIN" ? "Add another chat id" : "Add your chat id"}
                  value={recipientInput}
                />
                <button
                  className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-60"
                  disabled={!recipientInput.trim() || (session?.role !== "ADMIN" && recipients.length >= 1)}
                  onClick={() => {
                    void addTelegramRecipient(recipientInput).then((next) => {
                      setRecipients(next);
                      setRecipientInput("");
                    });
                  }}
                  type="button"
                >
                  Add
                </button>
              </div>
              <div className="mt-2 grid gap-2">
                {recipients.map((recipient) => (
                  <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2" key={recipient.recipient_id}>
                    <div className="font-mono text-sm text-white">{recipient.chat_id}</div>
                    <button
                      className="rounded-md border border-rose-300/25 bg-rose-300/10 px-2 py-1 text-xs text-rose-100 transition hover:bg-rose-300/20"
                      onClick={() => {
                        void removeTelegramRecipient(recipient.recipient_id).then(setRecipients);
                      }}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              {session?.role !== "ADMIN" ? (
                <div className="mt-2 text-xs text-slate-500">User accounts can keep only one Telegram destination.</div>
              ) : null}
            </div>

            {session?.role === "ADMIN" ? (
              <div>
                <label className="mb-2 block text-slate-500">Recipient policy</label>
                <div className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-slate-400">
                  Admin can add many Telegram chat ids and remove any of them. Each user can keep only one personal chat id.
                </div>
              </div>
            ) : null}

            <label className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-2">
              <span className="text-slate-400">Auto pair blocking</span>
              <input
                checked={settings.auto_block_enabled}
                className="accent-cyan-300"
                disabled={session?.role !== "ADMIN"}
                onChange={(event) => setSettings((current) => ({ ...current, auto_block_enabled: event.target.checked }))}
                type="checkbox"
              />
            </label>

            {session?.role === "ADMIN" ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-60"
                  disabled={isPending}
                  onClick={() => saveSettings(settings)}
                  type="button"
                >
                  Save controls
                </button>
                <button
                  className="rounded-lg border border-rose-300/25 bg-rose-300/10 px-3 py-2 text-rose-100 transition hover:bg-rose-300/20 disabled:opacity-60"
                  disabled={isPending}
                  onClick={hardReset}
                  type="button"
                >
                  Hard reset
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-slate-400">
                Sensitive controls and delivery settings are restricted to the admin terminal.
              </div>
            )}
          </div>
        </section>

        <aside className="grid content-start gap-3">
          {session?.role === "ADMIN" ? (
            <section className={`${panelClassName()} rounded-lg p-3`}>
              <SectionHeader title="Optimizer" icon={SlidersHorizontal} />
              <div className="grid gap-2 font-mono text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Auto blocked</span><strong>{data?.optimizer?.auto_blocked_pairs.length ? data.optimizer.auto_blocked_pairs.join(", ") : "None"}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Recommended on</span><strong>{data?.optimizer?.recommended_enabled_pairs.length ?? 0}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Recommended off</span><strong>{data?.optimizer?.recommended_disabled_pairs.length ?? 0}</strong></div>
                <button
                  className="mt-2 inline-flex items-center justify-between rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-amber-100 transition hover:bg-amber-300/20 disabled:opacity-60"
                  disabled={isPending}
                  onClick={applyOptimizerNow}
                  type="button"
                >
                  <span>Apply optimizer</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </section>
          ) : null}

          <section className={`${panelClassName()} rounded-lg p-3`}>
            <SectionHeader title="Live Learning" icon={Settings} />
            <div className="grid gap-2 font-mono text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Closed trades used</span><strong>{data?.learningStatus?.closed_trades_used ?? 0}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Wins / Losses</span><strong>{data?.learningStatus?.wins ?? 0} / {data?.learningStatus?.losses ?? 0}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Strongest setup</span><strong>{data?.learningStatus?.strongest_setup ?? "N/A"}</strong></div>
            </div>
          </section>
        </aside>
      </div>
    </TerminalShell>
  );
}
