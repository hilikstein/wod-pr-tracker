import assert from "node:assert/strict";
import { test } from "node:test";
import Database from "better-sqlite3";
import { initSchema, SCHEMA_VERSION } from "../lib/schema.mjs";

test("a new database gets the schema and its version", () => {
  const conn = new Database(":memory:");
  initSchema(conn);
  assert.equal(conn.pragma("user_version", { simple: true }), SCHEMA_VERSION);
  const tables = (conn.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]).map((t) => t.name);
  for (const t of ["users", "credentials", "invites", "entries", "favorites", "custom_movements", "login_sessions", "api_tokens"]) assert.ok(tables.includes(t), t);
});

test("opening twice is fine", () => {
  const conn = new Database(":memory:");
  initSchema(conn);
  initSchema(conn);
});

test("an old database with tables but no version is refused, not upgraded", () => {
  const conn = new Database(":memory:");
  conn.exec("CREATE TABLE entries (id INTEGER PRIMARY KEY, movement_id TEXT)");
  assert.throws(() => initSchema(conn), /must be migrated first/);
  assert.equal(conn.pragma("user_version", { simple: true }), 0);
});

test("a database from a newer version is refused", () => {
  const conn = new Database(":memory:");
  conn.pragma(`user_version = ${SCHEMA_VERSION + 1}`);
  assert.throws(() => initSchema(conn), /not supported/);
});

test("foreign keys are enforced", () => {
  const conn = new Database(":memory:");
  initSchema(conn);
  assert.throws(() => conn.prepare("INSERT INTO entries (user_id, movement_id, performed_on, score_primary, rx, created_at, updated_at) VALUES (999,'x','2026-01-01',1,1,'','')").run(), /FOREIGN KEY/);
});
