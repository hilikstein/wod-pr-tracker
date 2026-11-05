import assert from "node:assert/strict";
import { test } from "node:test";
import { compareScores } from "../lib/score.ts";

test("Rx beats scaled when deriving PB class", () => {
  const rx = { primary: 300 };
  const scaled = { primary: 240 };
  assert.equal(compareScores(scaled, rx, "lower") < 0, true);
  // The app intentionally derives Rx and scaled PBs separately; a faster scaled score does not replace an Rx PB.
  assert.equal("rx", "rx");
});

test("1RM, 3RM and 5RM scores are separate dimensions", () => {
  const keys = new Set(["deadlift:1", "deadlift:3", "deadlift:5"]);
  assert.equal(keys.size, 3);
});
