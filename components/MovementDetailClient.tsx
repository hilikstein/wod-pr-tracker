"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";
import { FavoriteButton } from "./FavoriteButton";
import type { Entry, Pb } from "@/lib/db";
import type { Movement } from "@/lib/catalog";
import { formatScore, parseScore } from "@/lib/score";

type Props = { movement: Movement; entries: Entry[]; favorite: boolean; pb: Pb | null; pb1?: Pb | null; pb3?: Pb | null; pb5?: Pb | null };

export function MovementDetailClient({ movement, entries, favorite, pb, pb1, pb3, pb5 }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<Entry | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const bestLine = movement.group === "lift" ? `1RM ${pbText(movement, pb1)}  ·  3RM ${pbText(movement, pb3)}  ·  5RM ${pbText(movement, pb5)}` : pbText(movement, pb);
  return (
    <div className="space-y-5">
      {movement.group === "benchmark" && movement.prescription ? (
        <section className="card space-y-2">
          <p className="kicker">Rx</p>
          <p className="rx">{movement.prescription}</p>
        </section>
      ) : null}
      <header className="flex items-start justify-between gap-3">
        <div className="card min-w-0 flex-1 space-y-1">
          <p className="kicker">Current PB</p>
          <p className="score text-2xl text-accent-soft">{bestLine}</p>
        </div>
        <FavoriteButton movementId={movement.id} initial={favorite} />
      </header>

      <EntryForm key={editing?.id ?? "new"} movement={movement} editing={editing} onCancel={() => setEditing(null)} onError={setErr} />
      {err && <p className="border border-bad/40 bg-bad/10 p-3 text-sm text-bad">{err}</p>}

      <section className="space-y-3">
        <h2 className="display text-xl">History</h2>
        {entries.length === 0 ? <p className="text-sm text-muted">No result yet — add the first one.</p> : entries.map((e) => (
          <article key={e.id} className="card space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="score text-2xl">{movement.group === "lift" ? `${e.lift_reps}RM  ·  ` : ""}{formatScore(movement.scoreKind, { primary: e.score_primary, secondary: e.score_secondary })}</p>
                <p className="mt-1 text-sm text-muted">{e.performed_on} · {e.rx ? "Rx" : "Scaled"}</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost px-3 py-1 text-[0.65rem]" onClick={() => setEditing(e)}>Edit</button>
                <button className="btn-danger px-3 py-1 text-[0.65rem]" onClick={async () => { await api(`/api/entries/${e.id}`, "DELETE", {}); router.refresh(); }}>Delete</button>
              </div>
            </div>
            {e.adaptations && <p className="text-sm"><span className="text-muted">Adaptations:</span> {e.adaptations}</p>}
            {e.notes && <p className="text-sm"><span className="text-muted">Notes:</span> {e.notes}</p>}
          </article>
        ))}
      </section>
    </div>
  );
}

function EntryForm({ movement, editing, onCancel, onError }: { movement: Movement; editing: Entry | null; onCancel: () => void; onError: (s: string | null) => void }) {
  const router = useRouter();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(editing?.performed_on ?? today);
  const [liftReps, setLiftReps] = useState(String(editing?.lift_reps ?? movement.liftReps[0] ?? ""));
  const [score, setScore] = useState(editing ? formatForInput(movement, editing) : "");
  const [rx, setRx] = useState(editing ? editing.rx === 1 : true);
  const [adaptations, setAdaptations] = useState(editing?.adaptations ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <form className="card space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      onError(null);
      try {
        const parsed = parseScore(movement.scoreKind, score);
        const body = { movement_id: movement.id, performed_on: date, lift_reps: movement.group === "lift" ? Number(liftReps) : null, score_primary: parsed.primary, score_secondary: parsed.secondary ?? null, rx, adaptations, notes };
        if (editing) await api(`/api/entries/${editing.id}`, "PATCH", body);
        else await api("/api/entries", "POST", body);
        router.refresh();
        onCancel();
        if (!editing) { setScore(""); setAdaptations(""); setNotes(""); setRx(true); }
      } catch (err) {
        onError((err as Error).message);
      } finally {
        setBusy(false);
      }
    }}>
      <h2 className="display text-xl">{editing ? "Edit result" : "Add result"}</h2>
      <label className="block space-y-1 text-sm text-muted">Date<input className="input text-fg" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
      {movement.group === "lift" && <label className="block space-y-1 text-sm text-muted">Rep max<select className="input text-fg" value={liftReps} onChange={(e) => setLiftReps(e.target.value)}>{movement.liftReps.map((r) => <option key={r} value={r}>{r}RM</option>)}</select></label>}
      <label className="block space-y-1 text-sm text-muted">Score<input className="input text-fg" value={score} onChange={(e) => setScore(e.target.value)} placeholder={placeholder(movement)} required /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rx} onChange={(e) => setRx(e.target.checked)} /> Rx / as prescribed</label>
      <label className="block space-y-1 text-sm text-muted">Adaptations<textarea className="input min-h-24 text-fg" value={adaptations} onChange={(e) => setAdaptations(e.target.value)} placeholder="What you actually changed — load, movement, range, equipment" /></label>
      <label className="block space-y-1 text-sm text-muted">Notes<textarea className="input min-h-16 text-fg" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      <div className="flex gap-2">
        <button className="btn-primary flex-1" disabled={busy}>{busy ? "Saving..." : "Save"}</button>
        {editing && <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

function pbText(m: Movement, e?: Pb | null) {
  if (!e) return "No result yet";
  return `${formatScore(m.scoreKind, { primary: e.score_primary, secondary: e.score_secondary })}${e.scaled ? " · Scaled" : " · Rx"} · ${e.performed_on}`;
}

function placeholder(m: Movement) {
  if (m.scoreKind === "time") return "4:38";
  if (m.scoreKind === "rounds_reps") return "12+8";
  if (m.scoreKind === "weight") return "100";
  if (m.scoreKind === "points") return "320";
  return "150";
}

function formatForInput(m: Movement, e: Entry) {
  if (m.scoreKind === "rounds_reps") return `${e.score_primary}+${e.score_secondary ?? 0}`;
  if (m.scoreKind === "time") {
    const total = Math.round(e.score_primary);
    const min = Math.floor(total / 60);
    const sec = total % 60;
    return `${min}:${String(sec).padStart(2, "0")}`;
  }
  return String(e.score_primary);
}
