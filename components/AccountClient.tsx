"use client";
import { startRegistration } from "@simplewebauthn/browser";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, BASE } from "./api";

type ApiTokenRow = { id: number; label: string; created_at: string; last_used_at: string | null };
type Cred = { id: string; label: string | null; created_at: string; last_used_at: string | null };

export function AccountClient({ hasPassword, passkeysEnabled, credentials, apiTokens }: { hasPassword: boolean; passkeysEnabled: boolean; credentials: Cred[]; apiTokens: ApiTokenRow[] }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [tokenLabel, setTokenLabel] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>, okText: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: okText });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <form className="card space-y-3" onSubmit={(e) => {
        e.preventDefault();
        if (next !== confirm) return setMsg({ ok: false, text: "The two passwords differ." });
        run(async () => {
          await api("/api/account/password", "POST", { current, next });
          setCurrent(""); setNext(""); setConfirm("");
        }, hasPassword ? "Password changed. Your other devices were signed out." : "Password set.");
      }}>
        <h2 className="display text-xl">{hasPassword ? "Change password" : "Set a password"}</h2>
        {hasPassword && <input className="input" type="password" autoComplete="current-password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} required />}
        <input className="input" type="password" autoComplete="new-password" placeholder="New password (10+ characters)" value={next} onChange={(e) => setNext(e.target.value)} required />
        <input className="input" type="password" autoComplete="new-password" placeholder="Repeat the new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        <button className="btn-primary w-full" disabled={busy}>Save password</button>
      </form>

      {passkeysEnabled && (
        <section className="card space-y-3">
          <h2 className="display text-xl">Passkeys</h2>
          {credentials.length === 0 && <p className="text-sm text-muted">No passkey yet.</p>}
          {credentials.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{c.label ?? "Passkey"} <span className="text-muted">· added {c.created_at.slice(0, 10)}{c.last_used_at ? ` · used ${c.last_used_at.slice(0, 10)}` : ""}</span></span>
              <button className="btn-ghost" disabled={busy} onClick={() => run(() => api(`/api/account/passkey/${encodeURIComponent(c.id)}`, "DELETE").then(() => undefined), "Passkey removed.")}>Remove</button>
            </div>
          ))}
          <button className="btn-ghost w-full" disabled={busy} onClick={() => run(async () => {
            const options = await api<Parameters<typeof startRegistration>[0]["optionsJSON"]>("/api/account/passkey/options", "POST", {});
            const response = await startRegistration({ optionsJSON: options });
            await api("/api/account/passkey/verify", "POST", response);
          }, "Passkey added.")}>Add a passkey on this device</button>
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="display text-xl">App access tokens</h2>
        <p className="text-sm text-muted">Let another app of yours read your lift numbers and latest WOD results (read-only). A token is shown once.</p>
        {apiTokens.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{t.label} <span className="text-muted">· created {t.created_at.slice(0, 10)}{t.last_used_at ? ` · used ${t.last_used_at.slice(0, 10)}` : " · never used"}</span></span>
            <button className="btn-ghost" disabled={busy} onClick={() => run(() => api(`/api/account/tokens/${t.id}`, "DELETE").then(() => undefined), "Token revoked.")}>Revoke</button>
          </div>
        ))}
        <form className="flex gap-2" onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const r = await api<{ token: string }>("/api/account/tokens", "POST", { label: tokenLabel });
            setNewToken(r.token);
            setTokenLabel("");
          }, "Token created. Copy it now.");
        }}>
          <input className="input" placeholder="What is it for? e.g. my gym app" value={tokenLabel} onChange={(e) => setTokenLabel(e.target.value)} required />
          <button className="btn-ghost" disabled={busy}>Create</button>
        </form>
        {newToken && <code className="block break-all rounded bg-black/30 p-2 text-xs">{newToken}</code>}
      </section>

      <section className="card space-y-3">
        <h2 className="display text-xl">Your data</h2>
        <a className="btn-ghost block w-full text-center" href={`${BASE}/api/account/export`}>Download everything as JSON</a>
      </section>

      <button className="btn-ghost w-full" onClick={async () => {
        await api("/api/auth/logout", "POST", {});
        if ("caches" in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
        router.replace("/login");
        router.refresh();
      }}>Sign out</button>

      {msg && <p className={`text-sm ${msg.ok ? "text-ok" : "text-bad"}`} role="status">{msg.text}</p>}
    </div>
  );
}
