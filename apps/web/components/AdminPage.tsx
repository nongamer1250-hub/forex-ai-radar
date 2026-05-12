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
      subtitle="Hidden operator route for issuing access keys, tracking sessions, and managing platform access."
      actions={
        <>
          <MetricPill label="Role" value={session?.role ?? "ADMIN"} tone="border-amber-500/20 bg-amber-500/10 text-amber-400" />
          <MetricPill label="Route" value="Private" />
        </>
      }
    >
      <div className="grid gap-4 2xl:grid-cols-[400px_1fr]">
        {/* Key Generation */}
        <TerminalSurface title="Generate Access Keys" icon={KeyRound}>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Label</label>
              <input
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-cyan-500/50"
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Premium user - Desk 4"
                value={label}
              />
            </div>

            <button
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-3 text-sm font-semibold text-zinc-900 shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/30"
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

            {latestKey && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-emerald-400">Latest key</div>
                <div className="break-all font-mono text-sm text-zinc-100">{latestKey}</div>
              </div>
            )}

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm leading-relaxed text-zinc-500">
              This route is not linked in user navigation. Keep the path and admin access key private.
            </div>
          </div>
        </TerminalSurface>

        {/* Main Content */}
        <div className="space-y-4">
          {/* Issued Keys */}
          <TerminalSurface title="Issued Keys" detail={`${adminState?.generated_keys.length ?? 0} keys`} icon={ShieldCheck}>
            <div className="space-y-3">
              {(adminState?.generated_keys ?? []).map((key) => (
                <div key={key.key_id} className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-base font-semibold text-zinc-100">{key.label}</div>
                    <span className={`font-mono text-xs ${key.status === "ACTIVE" ? "text-emerald-400" : "text-rose-400"}`}>
                      {key.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <DataChip label="Access Key" value={key.access_key} />
                    <DataChip label="Assigned User" value={key.assigned_user || "Unassigned"} />
                    <DataChip label="Created" value={formatDateTime(key.created_at)} />
                    <DataChip label="Redeemed" value={key.redeemed_at ? formatDateTime(key.redeemed_at) : "Pending"} />
                  </div>
                  {key.status === "ACTIVE" && (
                    <button
                      className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/20"
                      onClick={() => {
                        void revokeUserAccessKey(key.key_id).then((state) => {
                          setAdminState(state);
                        });
                      }}
                      type="button"
                    >
                      Revoke key
                    </button>
                  )}
                </div>
              ))}
            </div>
          </TerminalSurface>

          {/* Active Sessions */}
          <TerminalSurface title="Active Sessions" detail={`${adminState?.active_sessions.length ?? 0} sessions`} icon={Users}>
            <div className="space-y-3">
              {(adminState?.active_sessions ?? []).slice(0, 20).map((sessionRow) => (
                <div key={sessionRow.session_token} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-800/30 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-zinc-100">{sessionRow.user_name}</div>
                    <div className="mt-1 font-mono text-[10px] text-zinc-500">{sessionRow.key_id}</div>
                  </div>
                  <span className={`font-mono text-xs ${sessionRow.revoked_at ? "text-rose-400" : statusTone("OPEN")}`}>
                    {sessionRow.revoked_at ? "Revoked" : "Live"}
                  </span>
                </div>
              ))}
            </div>
          </TerminalSurface>

          {/* Notes */}
          <TerminalSurface title="Operator Notes" icon={EyeOff}>
            <div className="space-y-3 text-sm leading-relaxed text-zinc-400">
              <p>One access key binds to one user name at first successful login.</p>
              <p>Revoking a key invalidates future access and revokes the session chain.</p>
              <p>Keep the hidden route private. It is not linked from standard navigation.</p>
            </div>
          </TerminalSurface>
        </div>
      </div>
    </TerminalShell>
  );
}
