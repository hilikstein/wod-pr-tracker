import assert from "node:assert/strict";
import { test } from "node:test";
import { compareScores, formatScore, parseRoundsReps, parseTimeToSeconds } from "../lib/score.ts";

test("parses and formats time scores", () => {
  assert.equal(parseTimeToSeconds("4:38"), 278);
  assert.equal(parseTimeToSeconds("1:02:03"), 3723);
  assert.equal(formatScore("time", { primary: 278 }), "4:38");
});

test("compares lower and higher scores", () => {
  assert.equal(compareScores({ primary: 278 }, { primary: 300 }, "lower") < 0, true);
  assert.equal(compareScores({ primary: 120 }, { primary: 100 }, "higher") < 0, true);
});

test("parses rounds plus reps", () => {
  assert.deepEqual(parseRoundsReps("12+8"), { primary: 12, secondary: 8 });
  assert.equal(formatScore("rounds_reps", { primary: 12, secondary: 8 }), "12 + 8");
});
