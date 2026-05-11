"use client";

import { ChevronRight, Settings, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

import { MetricPill, SectionHeader, TerminalShell, panelClassName } from "@/components/terminal-ui";
import { useAuth } from "@/components/use-auth";
import { useDashboardData } from "@/components/use-live-data";
import { STRATEGY_PAIRS, STRATEGY_SETUPS } from "@/lib/constants";
import type { StrategySettings } from "@/lib/types";

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
  const [chatIdsInput, setChatIdsInput] = useState("");

  useEffect(() => {
    if (!data?.strategySettings) {
      return;
    }
    setSettings(data.strategySettings);
    setChatIdsInput((data.strategySettings.telegram_chat_ids ?? []).join(", "));
  }, [data?.strategySettings]);

  return (
    <TerminalShell
      title="Settings"
      subtitle="Control live pair routing, Telegram recipients, optimizer rules, and reset operations."
      actions={
        <>
          <MetricPill label="Recipients" value={String(settings.telegram_chat_ids.length)} />
          <MetricPill label="Mode" value={session?.role === "ADMIN" ? "Operator" : "Read only"} />
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
              <label className="mb-2 block text-slate-500">Telegram chat ids</label>
              <textarea
                className="min-h-24 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2"
                disabled={session?.role !== "ADMIN"}
                onChange={(event) => {
                  const value = event.target.value;
                  setChatIdsInput(value);
                  setSettings((current) => ({
                    ...current,
                    telegram_chat_ids: value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  }));
                }}
                placeholder="5834149438, 1234567890"
                value={chatIdsInput}
              />
            </div>

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

            <div className="grid grid-cols-2 gap-2">
              <button
                className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-60"
                disabled={isPending || session?.role !== "ADMIN"}
                onClick={() => saveSettings(settings)}
                type="button"
              >
                Save controls
              </button>
              <button
                className="rounded-lg border border-rose-300/25 bg-rose-300/10 px-3 py-2 text-rose-100 transition hover:bg-rose-300/20 disabled:opacity-60"
                disabled={isPending || session?.role !== "ADMIN"}
                onClick={hardReset}
                type="button"
              >
                Hard reset
              </button>
            </div>
          </div>
        </section>

        <aside className="grid content-start gap-3">
          <section className={`${panelClassName()} rounded-lg p-3`}>
            <SectionHeader title="Optimizer" icon={SlidersHorizontal} />
            <div className="grid gap-2 font-mono text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Auto blocked</span><strong>{data?.optimizer?.auto_blocked_pairs.length ? data.optimizer.auto_blocked_pairs.join(", ") : "None"}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Recommended on</span><strong>{data?.optimizer?.recommended_enabled_pairs.length ?? 0}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Recommended off</span><strong>{data?.optimizer?.recommended_disabled_pairs.length ?? 0}</strong></div>
              <button
                className="mt-2 inline-flex items-center justify-between rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-amber-100 transition hover:bg-amber-300/20 disabled:opacity-60"
                disabled={isPending || session?.role !== "ADMIN"}
                onClick={applyOptimizerNow}
                type="button"
              >
                <span>Apply optimizer</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </section>

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
