"use client";

import { EyeOff, KeyRound, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";

import {
  DataChip,
  MetricPill,
  TerminalShell,
  TerminalSurface,
  formatDateTime,
  statusTone,
} from "@/components/terminal-ui";
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
      subtitle="Hidden operator route for issuing user keys, tracking active sessions, and managing private platform access."
      actions={
        <>
          <MetricPill label="Role" value={session?.role ?? "ADMIN"} tone="border-amber-300/20 bg-amber-300/10 text-amber-100" />
          <MetricPill label="Route" value="Private" />
        </>
      }
    >
      <div className="grid gap-4 2xl:grid-cols-[420px_minmax(0,1fr)]">
        <TerminalSurface title="Generate Access Keys" icon={KeyRound}>
          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm text-slate-400">Label</label>
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none transition focus:border-cyan-300/35"
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Premium user - Desk 4"
                value={label}
              />
            </div>

            <button
              className="rounded-2xl border border-cyan-300/25 bg-cyan-300/12 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/20"
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
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-emerald-200">Latest key</div>
                <div className="break-all font-mono text-sm text-white">{latestKey}</div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-slate-400">
              This route is intentionally not linked in the user-facing navigation. Keep the path and the admin access key private.
            </div>
          </div>
        </TerminalSurface>

        <div className="grid gap-4">
          <TerminalSurface title="Issued Keys" detail={`${adminState?.generated_keys.length ?? 0} keys`} icon={ShieldCheck}>
            <div className="grid gap-3">
              {(adminState?.generated_keys ?? []).map((key) => (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4" key={key.key_id}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-base font-semibold text-white">{key.label}</div>
                    <span className={`font-mono text-xs ${key.status === "ACTIVE" ? "text-emerald-300" : "text-rose-300"}`}>{key.status}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DataChip label="Access Key" value={key.access_key} />
                    <DataChip label="Assigned User" value={key.assigned_user || "Unassigned"} />
                    <DataChip label="Created" value={formatDateTime(key.created_at)} />
                    <DataChip label="Redeemed" value={key.redeemed_at ? formatDateTime(key.redeemed_at) : "Pending"} />
                  </div>
                  {key.status === "ACTIVE" ? (
                    <button
                      className="mt-4 rounded-2xl border border-rose-300/25 bg-rose-300/12 px-4 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-300/20"
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
          </TerminalSurface>

          <TerminalSurface title="Active Sessions" detail={`${adminState?.active_sessions.length ?? 0} rows`} icon={Users}>
            <div className="grid gap-3">
              {(adminState?.active_sessions ?? []).slice(0, 20).map((sessionRow) => (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3" key={sessionRow.session_token}>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white">{sessionRow.user_name}</div>
                    <div className="mt-1 truncate font-mono text-[11px] text-slate-500">{sessionRow.key_id}</div>
                  </div>
                  <div className={`shrink-0 text-xs font-mono ${sessionRow.revoked_at ? "text-rose-300" : statusTone("OPEN")}`}>
                    {sessionRow.revoked_at ? "Revoked" : "Live"}
                  </div>
                </div>
              ))}
            </div>
          </TerminalSurface>

          <TerminalSurface title="Operator Notes" icon={EyeOff}>
            <div className="grid gap-3 text-sm leading-6 text-slate-400">
              <div>One access key binds to one user name at first successful login.</div>
              <div>Revoking a key invalidates future access and revokes the session chain attached to it.</div>
              <div>Keep the hidden route private. It is not linked from the standard user navigation.</div>
            </div>
          </TerminalSurface>
        </div>
      </div>
    </TerminalShell>
  );
}
