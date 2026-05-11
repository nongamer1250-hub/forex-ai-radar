"use client";

import { EyeOff, KeyRound, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { MetricPill, SectionHeader, TerminalShell, panelClassName, statusTone } from "@/components/terminal-ui";
import { useAuth } from "@/components/use-auth";
import { createUserAccessKey, getAdminState, revokeUserAccessKey } from "@/lib/api";
import type { AdminState } from "@/lib/types";

export function AdminPage() {
  const { session } = useAuth();
  const [adminState, setAdminState] = useState<AdminState | null>(null);
  const [label, setLabel] = useState("");
  const [latestKey, setLatestKey] = useState("");

  async function refresh() {
    const nextState = await getAdminState();
    setAdminState(nextState);
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <TerminalShell
      title="Admin Control"
      subtitle="Private operator route for access key issuance, user visibility, and high-impact controls."
      actions={
        <>
          <MetricPill label="Role" value={session?.role ?? "ADMIN"} tone="border-amber-300/20 bg-amber-300/10 text-amber-100" />
          <MetricPill label="Hidden Route" value="Private" />
        </>
      }
    >
      <div className="grid gap-3 2xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className={`${panelClassName()} rounded-lg p-3`}>
          <SectionHeader title="Generate User Keys" icon={KeyRound} />
          <div className="grid gap-3">
            <div>
              <label className="mb-2 block text-sm text-slate-400">Label</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 outline-none transition focus:border-cyan-300/40"
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Premium user - Desk 4"
                value={label}
              />
            </div>
            <button
              className="rounded-xl border border-cyan-300/25 bg-cyan-300/12 px-4 py-3 font-medium text-cyan-100 transition hover:bg-cyan-300/20"
              onClick={() => {
                void createUserAccessKey(label || "User key").then((payload) => {
                  if (!payload) {
                    return;
                  }
                  setLatestKey(payload.created.access_key);
                  setAdminState(payload.state);
                  setLabel("");
                });
              }}
              type="button"
            >
              Generate access key
            </button>

            {latestKey ? (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3">
                <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-emerald-200">Latest key</div>
                <div className="break-all font-mono text-sm text-white">{latestKey}</div>
              </div>
            ) : null}

            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-slate-400">
              This route is intentionally not linked in the main UI. Keep the path and the admin key private.
            </div>
          </div>
        </section>

        <div className="grid gap-3">
          <section className={`${panelClassName()} rounded-lg p-3`}>
            <SectionHeader title="Issued Keys" detail={`${adminState?.generated_keys.length ?? 0} keys`} icon={ShieldCheck} />
            <div className="grid gap-2">
              {(adminState?.generated_keys ?? []).map((key) => (
                <div className="rounded-lg border border-white/8 bg-white/[0.03] p-3" key={key.key_id}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <strong className="text-sm text-white">{key.label}</strong>
                    <span className={`font-mono text-xs ${key.status === "ACTIVE" ? "text-emerald-300" : "text-rose-300"}`}>{key.status}</span>
                  </div>
                  <div className="grid gap-1 font-mono text-xs text-slate-400">
                    <div className="break-all text-slate-300">{key.access_key}</div>
                    <div>User: {key.assigned_user || "Unassigned"}</div>
                    <div>Created: {new Date(key.created_at).toLocaleString()}</div>
                  </div>
                  {key.status === "ACTIVE" ? (
                    <button
                      className="mt-3 rounded-lg border border-rose-300/25 bg-rose-300/10 px-3 py-2 text-xs text-rose-100 transition hover:bg-rose-300/20"
                      onClick={() => {
                        void revokeUserAccessKey(key.key_id).then((state) => {
                          setAdminState(state);
                        });
                      }}
                      type="button"
                    >
                      Revoke key
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className={`${panelClassName()} rounded-lg p-3`}>
            <SectionHeader title="Active Sessions" detail={`${adminState?.active_sessions.length ?? 0} rows`} icon={Users} />
            <div className="grid gap-2">
              {(adminState?.active_sessions ?? []).slice(0, 20).map((sessionRow) => (
                <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2" key={sessionRow.session_token}>
                  <div className="min-w-0">
                    <div className="truncate text-sm text-white">{sessionRow.user_name}</div>
                    <div className="font-mono text-[11px] text-slate-500">{sessionRow.key_id}</div>
                  </div>
                  <div className={`text-xs ${sessionRow.revoked_at ? "text-rose-300" : statusTone("OPEN")}`}>
                    {sessionRow.revoked_at ? "Revoked" : "Live"}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={`${panelClassName()} rounded-lg p-3`}>
            <SectionHeader title="Operator Notes" icon={EyeOff} />
            <div className="grid gap-2 text-sm text-slate-400">
              <div>One access key binds to one user name on first login.</div>
              <div>Revoking a key immediately invalidates its live sessions.</div>
              <div>User pages remain visible only after backend session validation.</div>
            </div>
          </section>
        </div>
      </div>
    </TerminalShell>
  );
}
