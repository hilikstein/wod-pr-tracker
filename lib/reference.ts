import { allMovements, entriesFor, type Entry } from "./db.ts";
import { formatScore } from "./score.ts";

// What other apps may ask PBS for: the user's lift reference numbers and latest named-WOD results.
// Rules (decided by the owner, 2026-11-07):
//  - A lift's 1RM base is an Rx 1RM entry only ("As Rx" = "I count this as my real 1RM"). Scaled 1RMs never count.
//  - PR_BASIS=latest (default): the most recent Rx 1RM. PR_BASIS=max: the heaviest Rx 1RM.
//  - No Rx 1RM -> base is null; the 3RM and 5RM are given for reference. No substitute estimate.

export type PrBasis = "latest" | "max";

export function prBasis(): PrBasis {
  const v = process.env.PR_BASIS ?? "latest";
  if (v !== "latest" && v !== "max") throw new Error(`PR_BASIS must be "latest" or "max", got "${v}"`);
  return v;
}

type Ref = { kg: number; date: string; rx: boolean };
const ref = (e: Entry): Ref => ({ kg: e.score_primary, date: e.performed_on, rx: e.rx === 1 });
const newest = (a: Entry, b: Entry) => (a.performed_on === b.performed_on ? b.id - a.id : a.performed_on < b.performed_on ? 1 : -1);

export function oneRmBase(entries: Entry[], basis: PrBasis): Ref | null {
  const rx = entries.filter((e) => e.lift_reps === 1 && e.rx === 1);
  if (rx.length === 0) return null;
  if (basis === "latest") return ref([...rx].sort(newest)[0]);
  return ref([...rx].sort((a, b) => b.score_primary - a.score_primary || newest(a, b))[0]);
}

export function latestReps(entries: Entry[], reps: number): Ref | null {
  const rows = entries.filter((e) => e.lift_reps === reps).sort(newest);
  return rows.length ? ref(rows[0]) : null;
}

export function referenceFor(userId: number) {
  const basis = prBasis();
  const lifts = [];
  const wods = [];
  for (const m of allMovements(userId)) {
    const entries = entriesFor(userId, m.id);
    if (m.group === "lift") {
      lifts.push({ id: m.id, name: m.name, aliases: m.aliases, one_rm: oneRmBase(entries, basis), three_rm: latestReps(entries, 3), five_rm: latestReps(entries, 5) });
    } else {
      const last = [...entries].sort(newest)[0];
      wods.push({
        id: m.id, name: m.name, aliases: m.aliases,
        latest: last ? { date: last.performed_on, score: formatScore(m.scoreKind, { primary: last.score_primary, secondary: last.score_secondary }), rx: last.rx === 1, adaptations: last.adaptations } : null,
      });
    }
  }
  return { basis, lifts, wods };
}
