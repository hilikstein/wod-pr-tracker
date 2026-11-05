import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { CATALOG, movement, type Better, type Movement, type MovementGroup, type ScoreKind } from "./catalog.ts";
import { HttpError } from "./http.ts";
import { compareScores, type ScoreInput } from "./score.ts";
import { initSchema } from "./schema.mjs";

// Read when the database is first opened, not at import: the build has no runtime environment.
function dbPath(): string {
  return process.env.DB_PATH ?? path.join(process.cwd(), "data", "wod-pr-tracker.db");
}

declare global {
  var __wodPrTrackerDb: Database.Database | undefined;
}

export function nowIso(d = new Date()): string {
  return d.toISOString();
}

export function db() {
  if (!globalThis.__wodPrTrackerDb) {
    const file = dbPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const conn = new Database(file);
    conn.pragma("journal_mode = WAL");
    conn.pragma("busy_timeout = 5000");
    initSchema(conn);
    globalThis.__wodPrTrackerDb = conn;
  }
  return globalThis.__wodPrTrackerDb;
}

export type Entry = {
  id: number;
  user_id: number;
  movement_id: string;
  performed_on: string;
  lift_reps: number | null;
  score_primary: number;
  score_secondary: number | null;
  rx: 0 | 1;
  adaptations: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type EntryInput = Omit<Entry, "id" | "user_id" | "created_at" | "updated_at">;
export type Pb = Entry & { scaled: boolean };
export type MovementSummary = Movement & { favorite: boolean; pb1?: Pb | null; pb3?: Pb | null; pb5?: Pb | null; pb?: Pb | null; entries: number };

const MAX_CUSTOM_MOVEMENTS = 200;
const MAX_TEXT = 2000;

// ---- Movements --------------------------------------------------------------------------------

export function allMovements(userId: number): Movement[] {
  const custom = db().prepare("SELECT * FROM custom_movements WHERE user_id = ? ORDER BY name").all(userId) as Array<{
    id: string; name: string; group_name: MovementGroup; score_kind: ScoreKind; better: Better; prescription: string; aliases: string; lift_reps: string;
  }>;
  return [...CATALOG, ...custom.map((m) => ({
    id: m.id,
    group: m.group_name,
    name: m.name,
    aliases: JSON.parse(m.aliases || "[]"),
    scoreKind: m.score_kind,
    better: m.better,
    prescription: m.prescription,
    liftReps: JSON.parse(m.lift_reps || "[]"),
  }))];
}

export function getMovement(userId: number, id: string): Movement | undefined {
  return movement(id) ?? allMovements(userId).find((m) => m.id === id);
}

export function createCustomMovement(userId: number, input: { name: string; group: MovementGroup; scoreKind: ScoreKind; prescription?: string; liftReps?: number[] }) {
  const name = input.name.trim();
  if (!name) throw new HttpError(400, "name is required");
  if (name.length > 80) throw new HttpError(400, "name must be at most 80 characters");
  if ((input.prescription ?? "").length > 500) throw new HttpError(400, "prescription must be at most 500 characters");
  const count = (db().prepare("SELECT COUNT(*) c FROM custom_movements WHERE user_id = ?").get(userId) as { c: number }).c;
  if (count >= MAX_CUSTOM_MOVEMENTS) throw new HttpError(400, `at most ${MAX_CUSTOM_MOVEMENTS} custom movements`);
  const base = slug(name);
  let id = `custom-${base}`;
  let n = 2;
  while (getMovement(userId, id)) id = `custom-${base}-${n++}`;
  const liftReps = input.group === "lift" ? (input.liftReps?.length ? input.liftReps : [1, 3, 5]) : [];
  const better: Better = input.scoreKind === "time" ? "lower" : "higher";
  db().prepare("INSERT INTO custom_movements (user_id, id, name, group_name, score_kind, better, prescription, aliases, lift_reps, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .run(userId, id, name, input.group, input.scoreKind, better, input.prescription?.trim() ?? "", "[]", JSON.stringify(liftReps), nowIso());
  return getMovement(userId, id)!;
}

// ---- Favorites --------------------------------------------------------------------------------

export function favoriteIds(userId: number): Set<string> {
  return new Set((db().prepare("SELECT movement_id FROM favorites WHERE user_id = ?").all(userId) as { movement_id: string }[]).map((r) => r.movement_id));
}

export function setFavorite(userId: number, movementId: string, favorite: boolean) {
  requireMovement(userId, movementId);
  if (favorite) db().prepare("INSERT OR IGNORE INTO favorites (user_id, movement_id, created_at) VALUES (?, ?, ?)").run(userId, movementId, nowIso());
  else db().prepare("DELETE FROM favorites WHERE user_id = ? AND movement_id = ?").run(userId, movementId);
}

export function isFavorite(userId: number, movementId: string): boolean {
  return !!db().prepare("SELECT 1 FROM favorites WHERE user_id = ? AND movement_id = ?").get(userId, movementId);
}

// ---- Entries ----------------------------------------------------------------------------------

export function addEntry(userId: number, input: EntryInput) {
  const m = requireMovement(userId, input.movement_id);
  validateEntry(m, input);
  const now = nowIso();
  const res = db().prepare(`INSERT INTO entries
    (user_id, movement_id, performed_on, lift_reps, score_primary, score_secondary, rx, adaptations, notes, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(userId, input.movement_id, input.performed_on, input.lift_reps, input.score_primary, input.score_secondary ?? null,
      input.rx, input.adaptations.trim(), input.notes.trim(), now, now);
  return getEntry(userId, Number(res.lastInsertRowid))!;
}

export function updateEntry(userId: number, id: number, input: Partial<EntryInput>) {
  const current = getEntry(userId, id);
  if (!current) throw new HttpError(404, "entry not found");
  const next = { ...current, ...input, id: current.id, user_id: userId, created_at: current.created_at, updated_at: nowIso() };
  const m = requireMovement(userId, next.movement_id);
  validateEntry(m, next);
  db().prepare(`UPDATE entries SET movement_id=?, performed_on=?, lift_reps=?, score_primary=?, score_secondary=?, rx=?, adaptations=?, notes=?, updated_at=? WHERE id=? AND user_id=?`)
    .run(next.movement_id, next.performed_on, next.lift_reps, next.score_primary, next.score_secondary ?? null,
      next.rx, next.adaptations.trim(), next.notes.trim(), next.updated_at, id, userId);
  return getEntry(userId, id)!;
}

export function deleteEntry(userId: number, id: number) {
  db().prepare("DELETE FROM entries WHERE id = ? AND user_id = ?").run(id, userId);
}

export function getEntry(userId: number, id: number): Entry | undefined {
  return db().prepare("SELECT * FROM entries WHERE id = ? AND user_id = ?").get(id, userId) as Entry | undefined;
}

export function entriesFor(userId: number, movementId: string): Entry[] {
  return db().prepare("SELECT * FROM entries WHERE user_id = ? AND movement_id = ? ORDER BY performed_on DESC, id DESC").all(userId, movementId) as Entry[];
}

export function exportAll(userId: number) {
  return {
    exported_at: nowIso(),
    custom_movements: db().prepare("SELECT id, name, group_name, score_kind, better, prescription, lift_reps, created_at FROM custom_movements WHERE user_id = ? ORDER BY id").all(userId),
    favorites: (db().prepare("SELECT movement_id FROM favorites WHERE user_id = ? ORDER BY movement_id").all(userId) as { movement_id: string }[]).map((r) => r.movement_id),
    entries: db().prepare("SELECT movement_id, performed_on, lift_reps, score_primary, score_secondary, rx, adaptations, notes, created_at, updated_at FROM entries WHERE user_id = ? ORDER BY performed_on, id").all(userId),
  };
}

// ---- Summaries and personal bests -------------------------------------------------------------

export function summaries(userId: number, group: MovementGroup | "all" = "all", onlyFavorites = false): MovementSummary[] {
  const fav = favoriteIds(userId);
  return allMovements(userId)
    .filter((m) => group === "all" || m.group === group)
    .filter((m) => !onlyFavorites || fav.has(m.id))
    .map((m) => summarize(userId, m, fav.has(m.id)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function summarize(userId: number, m: Movement, favorite = isFavorite(userId, m.id)): MovementSummary {
  const entries = entriesFor(userId, m.id);
  const base = { ...m, favorite, entries: entries.length };
  if (m.group === "lift") return { ...base, pb1: bestFor(m, entries, 1), pb3: bestFor(m, entries, 3), pb5: bestFor(m, entries, 5) };
  return { ...base, pb: bestFor(m, entries, null) };
}

export function bestFor(m: Movement, rows: Entry[], reps: number | null): Pb | null {
  const candidates = rows.filter((e) => e.lift_reps === reps);
  const rxBest = best(candidates.filter((e) => e.rx === 1), m.better);
  if (rxBest) return { ...rxBest, scaled: false };
  const scaled = best(candidates, m.better);
  return scaled ? { ...scaled, scaled: true } : null;
}

function best(rows: Entry[], better: Better): Entry | null {
  return rows.reduce<Entry | null>((winner, row) => {
    if (!winner) return row;
    return compareScores(score(row), score(winner), better) < 0 ? row : winner;
  }, null);
}

export function score(e: Pick<Entry, "score_primary" | "score_secondary">): ScoreInput {
  return { primary: e.score_primary, secondary: e.score_secondary };
}

// ---- Misc -------------------------------------------------------------------------------------

export function logEvent(kind: string, message: string) {
  db().prepare("INSERT INTO events (kind, message, created_at) VALUES (?, ?, ?)").run(kind, message, nowIso());
}

function requireMovement(userId: number, id: string) {
  const m = getMovement(userId, id);
  if (!m) throw new HttpError(404, `unknown movement ${id}`);
  return m;
}

function validateEntry(m: Movement, e: EntryInput) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.performed_on) || Number.isNaN(Date.parse(e.performed_on))) throw new HttpError(400, "date must be yyyy-mm-dd");
  if (m.group === "lift") {
    if (!m.liftReps.includes(Number(e.lift_reps))) throw new HttpError(400, `lift entry must be one of ${m.liftReps.map((r) => `${r}RM`).join(", ")}`);
  } else if (e.lift_reps !== null) {
    throw new HttpError(400, "benchmark entries cannot carry lift reps");
  }
  if (!Number.isFinite(e.score_primary) || e.score_primary < 0) throw new HttpError(400, "score must be non-negative");
  if (e.score_secondary !== null && e.score_secondary !== undefined && (!Number.isInteger(e.score_secondary) || e.score_secondary < 0)) throw new HttpError(400, "secondary score must be a non-negative integer");
  if (e.adaptations.length > MAX_TEXT || e.notes.length > MAX_TEXT) throw new HttpError(400, `adaptations and notes must be at most ${MAX_TEXT} characters`);
}

function slug(s: string) {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "movement";
}
