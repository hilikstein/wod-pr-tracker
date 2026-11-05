import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { CATALOG, searchMovements } from "../lib/catalog.ts";
import { movementHero } from "../lib/photos.ts";

test("catalog includes requested benchmarks and lifts", () => {
  const ids = new Set(CATALOG.map((m) => m.id));
  for (const id of ["fran", "murph", "cindy", "clean-and-jerk", "back-squat", "deadlift"]) assert.equal(ids.has(id), true, id);
});

test("every catalog lift has its own hero photo", () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "photos");
  for (const m of CATALOG.filter((row) => row.group === "lift")) {
    const file = path.join(root, movementHero(m));
    assert.equal(existsSync(file), true, file);
  }
});

test("search covers aliases", () => {
  assert.equal(searchMovements("all", "c&j")[0].id, "clean-and-jerk");
  assert.equal(searchMovements("lift", "bs")[0].id, "back-squat");
});

test("every catalog lift tracks 1RM, 3RM and 5RM", () => {
  for (const m of CATALOG.filter((row) => row.group === "lift")) assert.deepEqual(m.liftReps, [1, 3, 5], m.id);
});
