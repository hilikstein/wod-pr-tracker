import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

process.env.DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pbl-ref-")), "test.db");
const users = await import("../lib/users.ts");
const data = await import("../lib/db.ts");
const tokens = await import("../lib/tokens.ts");
const ref = await import("../lib/reference.ts");
const { HttpError } = await import("../lib/http.ts");

const inv = users.createInvite({ createdBy: null, role: "admin" });
const u = users.redeemInvite(inv.token, { username: "lifter", passwordHash: "x" });

const add = (movement_id: string, performed_on: string, lift_reps: number | null, score_primary: number, rx: 0 | 1, adaptations = "") =>
  data.addEntry(u.id, { movement_id, performed_on, lift_reps, score_primary, score_secondary: null, rx, adaptations, notes: "" });

add("deadlift", "2020-01-01", 1, 160, 1);
add("deadlift", "2026-10-01", 1, 140, 1);
add("deadlift", "2026-11-01", 1, 150, 0);            // scaled: never a base
add("back-squat", "2026-09-01", 1, 130, 1);
add("back-squat", "2026-10-20", 3, 110, 0);
add("back-squat", "2026-10-25", 5, 100, 1);
add("bench-press", "2026-10-25", 3, 80, 1);          // no 1RM at all

const lift = (r: ReturnType<typeof ref.referenceFor>, id: string) => r.lifts.find((l) => l.id === id)!;

test("latest basis: most recent Rx 1RM wins over a heavier old one; scaled 1RMs never count", () => {
  delete process.env.PR_BASIS;
  const r = ref.referenceFor(u.id);
  assert.equal(r.basis, "latest");
  assert.deepEqual(lift(r, "deadlift").one_rm, { kg: 140, date: "2026-10-01", rx: true });
});

test("max basis: heaviest Rx 1RM", () => {
  process.env.PR_BASIS = "max";
  assert.equal(lift(ref.referenceFor(u.id), "deadlift").one_rm!.kg, 160);
  delete process.env.PR_BASIS;
});

test("an invalid PR_BASIS fails loudly", () => {
  process.env.PR_BASIS = "average";
  assert.throws(() => ref.referenceFor(u.id), /PR_BASIS/);
  delete process.env.PR_BASIS;
});

test("no Rx 1RM: base is null and 3RM/5RM are given for reference", () => {
  const r = ref.referenceFor(u.id);
  const b = lift(r, "bench-press");
  assert.equal(b.one_rm, null);
  assert.deepEqual(b.three_rm, { kg: 80, date: "2026-10-25", rx: true });
  assert.equal(b.five_rm, null);
  assert.equal(lift(r, "back-squat").three_rm!.rx, false);
});

test("a named WOD reports its latest result with adaptations; none recorded is null", () => {
  add("fran", "2026-05-01", null, 300, 1);
  add("fran", "2026-10-30", null, 420, 0, "ring rows, 30 kg thrusters");
  const r = ref.referenceFor(u.id);
  const fran = r.wods.find((w) => w.id === "fran")!;
  assert.deepEqual(fran.latest, { date: "2026-10-30", score: "7:00", rx: false, adaptations: "ring rows, 30 kg thrusters" });
  assert.equal(r.wods.find((w) => w.id === "murph")!.latest, null);
});

test("api tokens: shown once, hashed, per user, revocable, dead when the user is disabled", () => {
  const { token, row } = tokens.createApiToken(u.id, "gym app");
  assert.match(token, /^pbt_/);
  assert.equal(tokens.userForApiToken(token)!.id, u.id);
  assert.equal(tokens.userForApiToken("pbt_nope"), undefined);
  const stored = data.db().prepare("SELECT token_hash FROM api_tokens WHERE id = ?").get(row.id) as { token_hash: string };
  assert.notEqual(stored.token_hash, token);
  assert.notEqual(tokens.listApiTokens(u.id)[0].last_used_at, null);
  assert.throws(() => tokens.bearerToken(new Request("http://x", { headers: { authorization: "Basic abc" } })), HttpError);
  assert.equal(tokens.bearerToken(new Request("http://x", { headers: { authorization: `Bearer ${token}` } })), token);
  tokens.revokeApiToken(u.id, row.id);
  assert.equal(tokens.userForApiToken(token), undefined);
});
