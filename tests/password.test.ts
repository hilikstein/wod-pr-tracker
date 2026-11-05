import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, validatePassword, verifyPassword } from "../lib/password.ts";

test("a password verifies against its own hash only", async () => {
  const hash = await hashPassword("correct horse battery");
  assert.equal(await verifyPassword("correct horse battery", hash), true);
  assert.equal(await verifyPassword("correct horse batterz", hash), false);
});

test("two hashes of the same password differ (random salt)", async () => {
  assert.notEqual(await hashPassword("same password here"), await hashPassword("same password here"));
});

test("length limits are enforced", () => {
  assert.throws(() => validatePassword("short"), /at least 10/);
  assert.throws(() => validatePassword("x".repeat(129)), /at most 128/);
  validatePassword("long enough password");
});

test("an unrecognised hash format fails loudly instead of passing", async () => {
  await assert.rejects(verifyPassword("anything", "plaintext"), /unrecognised/);
});
