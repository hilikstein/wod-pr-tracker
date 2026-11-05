import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

process.env.DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pbl-test-")), "test.db");
const users = await import("../lib/users.ts");
const data = await import("../lib/db.ts");
const { hashPassword } = await import("../lib/password.ts");
const { HttpError } = await import("../lib/http.ts");

async function signup(username: string, role: "admin" | "member" = "member", password = "a long enough password") {
  const inv = users.createInvite({ createdBy: null, role });
  return users.redeemInvite(inv.token, { username, passwordHash: await hashPassword(password) });
}

const status = (fn: () => unknown) => {
  try { fn(); } catch (e) { return e instanceof HttpError ? e.status : "other"; }
  return "no error";
};

test("signup invite creates the account once; the second use is refused", async () => {
  const inv = users.createInvite({ createdBy: null, role: "admin" });
  const u = users.redeemInvite(inv.token, { username: "Alice", passwordHash: await hashPassword("a long enough password") });
  assert.equal(u.username, "alice");
  assert.equal(u.role, "admin");
  assert.equal(status(() => users.redeemInvite(inv.token, { username: "alice2", passwordHash: "x" })), 404);
  assert.equal(users.getUserByUsername("alice2"), undefined);
});

test("revoked and expired invites cannot be used", async () => {
  const a = users.createInvite({ createdBy: null });
  users.revokeInvite(a.id);
  assert.equal(users.openInvite(a.token), undefined);
  const b = users.createInvite({ createdBy: null });
  data.db().prepare("UPDATE invites SET expires_at = '2000-01-01T00:00:00.000Z' WHERE id = ?").run(b.id);
  assert.equal(users.openInvite(b.token), undefined);
  assert.equal(users.openInvite("not-a-token"), undefined);
});

test("a taken username is refused and the invite stays usable", async () => {
  await signup("bob");
  const inv = users.createInvite({ createdBy: null });
  assert.equal(status(() => users.redeemInvite(inv.token, { username: "BOB", passwordHash: "x" })), 409);
  assert.ok(users.openInvite(inv.token));
});

test("bad usernames are refused", () => {
  for (const bad of ["ab", "has space", "-lead", "x".repeat(65), "", "semi;colon"]) assert.throws(() => users.normalizeUsername(bad), /username must be/, bad);
  assert.equal(users.normalizeUsername("  Me@Example.com "), "me@example.com");
});

test("password login: right, wrong, unknown and disabled all behave", async () => {
  const u = await signup("carol", "member", "carol's long password");
  assert.equal((await users.authenticate("carol", "carol's long password")).id, u.id);
  await assert.rejects(users.authenticate("carol", "wrong"), /wrong username or password/);
  await assert.rejects(users.authenticate("nobody", "whatever long"), /wrong username or password/);
  users.setDisabled(u.id, true);
  await assert.rejects(users.authenticate("carol", "carol's long password"), /wrong username or password/);
  users.setDisabled(u.id, false);
  assert.equal((await users.authenticate("carol", "carol's long password")).id, u.id);
});

test("disabling a user ends their sessions", async () => {
  const u = await signup("dave");
  const { token } = users.createSession(u.id);
  assert.equal(users.sessionUser(token)?.id, u.id);
  users.setDisabled(u.id, true);
  assert.equal(users.sessionUser(token), undefined);
});

test("the last active admin cannot be disabled", async () => {
  const only = data.db().prepare("SELECT COUNT(*) c FROM users WHERE role='admin' AND disabled_at IS NULL").get() as { c: number };
  assert.ok(only.c >= 1);
  const admins = data.db().prepare("SELECT id FROM users WHERE role='admin' AND disabled_at IS NULL").all() as { id: number }[];
  for (const a of admins.slice(1)) users.setDisabled(a.id, true);
  assert.equal(status(() => users.setDisabled(admins[0].id, true)), 409);
});

test("sessions: lookup, logout and revoke-others", async () => {
  const u = await signup("erin");
  const s1 = users.createSession(u.id);
  const s2 = users.createSession(u.id);
  users.revokeSessions(u.id, s1.token);
  assert.ok(users.sessionUser(s1.token));
  assert.equal(users.sessionUser(s2.token), undefined);
  users.deleteSession(s1.token);
  assert.equal(users.sessionUser(s1.token), undefined);
  assert.equal(users.sessionUser("garbage"), undefined);
});

test("recovery invite sets a new password, ends old sessions and works once", async () => {
  const u = await signup("frank", "member", "old long password");
  const old = users.createSession(u.id);
  const rec = users.createInvite({ createdBy: null, kind: "recovery", userId: u.id });
  users.redeemInvite(rec.token, { passwordHash: await hashPassword("brand new password") });
  assert.equal(users.sessionUser(old.token), undefined);
  assert.equal((await users.authenticate("frank", "brand new password")).id, u.id);
  await assert.rejects(users.authenticate("frank", "old long password"), /wrong username/);
  assert.equal(status(() => users.redeemInvite(rec.token, { passwordHash: "x" })), 404);
});

test("changing a password needs the current one", async () => {
  const u = await signup("gina", "member", "current long password");
  await assert.rejects(users.changePassword(u.id, "nope", "another long password"), /current password is wrong/);
  await assert.rejects(users.changePassword(u.id, null, "another long password"), /current password is wrong/);
  await users.changePassword(u.id, "current long password", "another long password");
  assert.equal((await users.authenticate("gina", "another long password")).id, u.id);
});

test("a passkey-only account cannot remove its only passkey; with a password it can", async () => {
  const inv = users.createInvite({ createdBy: null });
  const u = users.redeemInvite(inv.token, { username: "hana", credential: { id: "cred-1", publicKey: new Uint8Array([1, 2, 3]), counter: 0 } });
  assert.equal(u.has_password, false);
  assert.equal(status(() => users.deleteCredential(u.id, "cred-1")), 409);
  await users.setPassword(u.id, "hana has a password now");
  users.deleteCredential(u.id, "cred-1");
  assert.equal(users.listCredentials(u.id).length, 0);
});

test("a passkey cannot be removed by another user", async () => {
  const inv = users.createInvite({ createdBy: null });
  const a = users.redeemInvite(inv.token, { username: "ivan", credential: { id: "cred-ivan", publicKey: new Uint8Array([9]), counter: 0 } });
  const b = await signup("judy");
  assert.equal(status(() => users.deleteCredential(b.id, "cred-ivan")), 404);
  assert.equal(users.listCredentials(a.id).length, 1);
});

test("users cannot see or touch each other's results", async () => {
  const a = await signup("kim");
  const b = await signup("liam");
  const e = data.addEntry(a.id, { movement_id: "deadlift", performed_on: "2026-01-02", lift_reps: 1, score_primary: 180, score_secondary: null, rx: 1, adaptations: "", notes: "mine" });
  assert.equal(data.getEntry(b.id, e.id), undefined);
  assert.deepEqual(data.entriesFor(b.id, "deadlift"), []);
  assert.equal(status(() => data.updateEntry(b.id, e.id, { score_primary: 1 })), 404);
  data.deleteEntry(b.id, e.id);
  assert.equal(data.getEntry(a.id, e.id)?.score_primary, 180);
  assert.equal(data.summarize(a.id, data.getMovement(a.id, "deadlift")!).pb1?.score_primary, 180);
  assert.equal(data.summarize(b.id, data.getMovement(b.id, "deadlift")!).pb1, null);
  assert.equal(data.exportAll(b.id).entries.length, 0);
  assert.equal(data.exportAll(a.id).entries.length, 1);
});

test("custom movements and favorites are per user", async () => {
  const a = await signup("mona");
  const b = await signup("nick");
  const m = data.createCustomMovement(a.id, { name: "My complex", group: "benchmark", scoreKind: "weight" });
  assert.ok(data.getMovement(a.id, m.id));
  assert.equal(data.getMovement(b.id, m.id), undefined);
  assert.equal(status(() => data.addEntry(b.id, { movement_id: m.id, performed_on: "2026-01-01", lift_reps: null, score_primary: 50, score_secondary: null, rx: 1, adaptations: "", notes: "" })), 404);
  const same = data.createCustomMovement(b.id, { name: "My complex", group: "benchmark", scoreKind: "time" });
  assert.equal(same.id, m.id);
  assert.equal(data.getMovement(b.id, m.id)?.scoreKind, "time");
  data.setFavorite(a.id, "fran", true);
  assert.ok(data.favoriteIds(a.id).has("fran"));
  assert.equal(data.favoriteIds(b.id).has("fran"), false);
});

test("lifts track 1RM, 3RM and 5RM separately; others are refused", async () => {
  const u = await signup("olga");
  const add = (reps: number | null, score: number) => data.addEntry(u.id, { movement_id: "back-squat", performed_on: "2026-02-01", lift_reps: reps, score_primary: score, score_secondary: null, rx: 1, adaptations: "", notes: "" });
  add(1, 130); add(3, 110); add(5, 100); add(5, 95);
  const s = data.summarize(u.id, data.getMovement(u.id, "back-squat")!);
  assert.deepEqual([s.pb1?.score_primary, s.pb3?.score_primary, s.pb5?.score_primary], [130, 110, 100]);
  assert.equal(status(() => add(2, 120)), 400);
  assert.equal(status(() => add(null, 120)), 400);
});

test("benchmark time: lower is better, and Rx beats a faster scaled score", async () => {
  const u = await signup("pete");
  const add = (score: number, rx: 0 | 1) => data.addEntry(u.id, { movement_id: "fran", performed_on: "2026-03-01", lift_reps: null, score_primary: score, score_secondary: null, rx, adaptations: rx ? "" : "banded pull-ups", notes: "" });
  add(300, 0); add(420, 1); add(450, 1);
  const pb = data.summarize(u.id, data.getMovement(u.id, "fran")!).pb;
  assert.equal(pb?.score_primary, 420);
  assert.equal(pb?.scaled, false);
});

test("entry validation", async () => {
  const u = await signup("quinn");
  const base = { movement_id: "fran", performed_on: "2026-03-01", lift_reps: null, score_primary: 300, score_secondary: null, rx: 1 as const, adaptations: "", notes: "" };
  assert.equal(status(() => data.addEntry(u.id, { ...base, performed_on: "03/01/2026" })), 400);
  assert.equal(status(() => data.addEntry(u.id, { ...base, performed_on: "2026-13-45" })), 400);
  assert.equal(status(() => data.addEntry(u.id, { ...base, score_primary: -1 })), 400);
  assert.equal(status(() => data.addEntry(u.id, { ...base, notes: "x".repeat(2001) })), 400);
  assert.equal(status(() => data.addEntry(u.id, { ...base, movement_id: "nope" })), 404);
});

test("the very first account is the admin, even from a member invite; later ones are not", async () => {
  // Fresh database, so this is the first account on the installation.
  const fresh = await new Promise<string>((resolve, reject) => {
    import("node:child_process").then(({ execFileSync }) => {
      try {
        const out = execFileSync(process.execPath, ["--input-type=module", "-e", `
          process.env.DB_PATH = ${JSON.stringify(path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pbl-first-")), "first.db"))};
          const users = await import(${JSON.stringify(new URL("../lib/users.ts", import.meta.url).href)});
          const { hashPassword } = await import(${JSON.stringify(new URL("../lib/password.ts", import.meta.url).href)});
          const make = async (name) => users.redeemInvite(users.createInvite({ createdBy: null, role: "member" }).token, { username: name, passwordHash: await hashPassword("a long enough password") }).role;
          console.log([await make("first-user"), await make("second-user")].join(","));
        `], { encoding: "utf8" });
        resolve(out.trim());
      } catch (e) { reject(e); }
    });
  });
  assert.equal(fresh, "admin,member");
});
