import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pbl-script-"));
process.env.DB_PATH = path.join(dir, "script.db");
const script = path.join(import.meta.dirname, "..", "scripts", "create-invite.mjs");

test("the bootstrap script creates a link the app accepts, as an admin invite", async () => {
  const run = spawnSync(process.execPath, [script, "--admin", "--note", "first account"], { env: { ...process.env, ORIGIN: "https://pb.example.com", BASE_PATH: "/pb" }, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  const link = run.stdout.trim();
  assert.match(link, /^https:\/\/pb\.example\.com\/pb\/invite\/[A-Za-z0-9_-]{43}$/);
  const users = await import("../lib/users.ts");
  const invite = users.openInvite(link.split("/").pop()!);
  assert.equal(invite?.role, "admin");
  assert.equal(invite?.note, "first account");
});

test("the script refuses to run without ORIGIN", () => {
  const env = { ...process.env }; delete env.ORIGIN;
  const run = spawnSync(process.execPath, [script], { env, encoding: "utf8" });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /ORIGIN/);
});
