"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

type U = { id: number; username: string; role: string; entries: number; last_login_at: string | null; disabled: boolean };
type I = { id: number; note: string; kind: string; username: string | null; created_at: string; expires_at: string; status: string; used_by_name: string | null };

export function AdminClient({ me, users, invites }: { me: number; users: U[]; invites: I[] }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [days, setDays] = useState("7");
  const [link, setLink] = useState<{ text: string; label: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <form className="card space-y-3" onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          const res = await api<{ link: string }>("/api/admin/invites", "POST", { note, ttl_days: Number(days) });
          setLink({ text: res.link, label: "Invite link. Shown once; send it to the person." });
          setNote("");
        });
      }}>
        <h2 className="display text-xl">Invite someone</h2>
        <input className="input" placeholder="Who is it for? (a note only you see)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} />
        <select className="input" value={days} onChange={(e) => setDays(e.target.value)}>
          <option value="1">Valid for 1 day</option>
          <option value="7">Valid for 7 days</option>
          <option value="30">Valid for 30 days</option>
        </select>
        <button className="btn-primary w-full" disabled={busy}>Create invite link</button>
      </form>

      {link && (
        <section className="card space-y-2">
          <p className="kicker">{link.label}</p>
          <input className="input" readOnly value={link.text} onFocus={(e) => e.currentTarget.select()} />
          <button className="btn-ghost w-full" onClick={() => navigator.clipboard.writeText(link.text)}>Copy</button>
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="display text-xl">People</h2>
        {users.map((u) => (
          <div key={u.id} className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate"><strong>{u.username}</strong> <span className="text-muted">· {u.role} · {u.entries} results{u.disabled ? " · disabled" : ""}{u.last_login_at ? ` · last in ${u.last_login_at.slice(0, 10)}` : ""}</span></span>
            </div>
            {u.id !== me && (
              <div className="flex gap-2">
                <button className="btn-ghost" disabled={busy} onClick={() => run(async () => {
                  const res = await api<{ link: string }>(`/api/admin/users/${u.id}/recovery`, "POST", {});
                  setLink({ text: res.link, label: `Sign-in recovery link for ${u.username}. Valid 1 day, shown once.` });
                })}>Recovery link</button>
                <button className="btn-ghost" disabled={busy} onClick={() => run(() => api(`/api/admin/users/${u.id}`, "PATCH", { disabled: !u.disabled }).then(() => undefined))}>{u.disabled ? "Enable" : "Disable"}</button>
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="card space-y-3">
        <h2 className="display text-xl">Invites</h2>
        {invites.length === 0 && <p className="text-sm text-muted">None yet.</p>}
        {invites.map((i) => (
          <div key={i.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{i.kind === "recovery" ? `recovery · ${i.username}` : i.note || "invite"} <span className="text-muted">· {i.status}{i.used_by_name ? ` by ${i.used_by_name}` : ""} · {i.status === "open" ? `until ${i.expires_at.slice(0, 10)}` : i.created_at.slice(0, 10)}</span></span>
            {i.status === "open" && <button className="btn-ghost" disabled={busy} onClick={() => run(() => api(`/api/admin/invites/${i.id}`, "DELETE").then(() => undefined))}>Revoke</button>}
          </div>
        ))}
      </section>
      {err && <p className="text-sm text-bad" role="alert">{err}</p>}
    </div>
  );
}
