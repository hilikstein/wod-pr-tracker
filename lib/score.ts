import type { Better, ScoreKind } from "./catalog";

export type ScoreInput = { primary: number; secondary?: number | null };

export function parseTimeToSeconds(input: string): number {
  const s = input.trim();
  if (!s) throw new Error("time is required");
  const parts = s.split(":").map((p) => p.trim());
  if (parts.length === 1) {
    const n = Number(parts[0]);
    if (!Number.isFinite(n) || n <= 0) throw new Error("time must be positive seconds");
    return Math.round(n);
  }
  if (parts.length === 2) {
    const min = Number(parts[0]);
    const sec = Number(parts[1]);
    if (!Number.isInteger(min) || !Number.isFinite(sec) || min < 0 || sec < 0 || sec >= 60) throw new Error("time must be mm:ss");
    return Math.round(min * 60 + sec);
  }
  if (parts.length === 3) {
    const hr = Number(parts[0]);
    const min = Number(parts[1]);
    const sec = Number(parts[2]);
    if (!Number.isInteger(hr) || !Number.isInteger(min) || !Number.isFinite(sec) || hr < 0 || min < 0 || min >= 60 || sec < 0 || sec >= 60) throw new Error("time must be hh:mm:ss");
    return Math.round(hr * 3600 + min * 60 + sec);
  }
  throw new Error("time must be mm:ss");
}

export function formatTime(totalSeconds: number): string {
  const total = Math.round(totalSeconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function parseRoundsReps(input: string): ScoreInput {
  const s = input.trim().toLowerCase();
  const match = s.match(/^(\d+)(?:\s*(?:\+|r|rounds?)\s*(\d+))?$/);
  if (!match) throw new Error("score must be rounds+reps, like 12+8");
  return { primary: Number(match[1]), secondary: match[2] ? Number(match[2]) : 0 };
}

export function formatScore(kind: ScoreKind, score: ScoreInput): string {
  if (kind === "time") return formatTime(score.primary);
  if (kind === "weight") return `${trim(score.primary)} kg`;
  if (kind === "rounds_reps") return `${trim(score.primary)} + ${score.secondary ?? 0}`;
  if (kind === "points") return `${trim(score.primary)} pts`;
  return `${trim(score.primary)} reps`;
}

export function betterScore(a: ScoreInput, b: ScoreInput, better: Better): ScoreInput {
  return compareScores(a, b, better) <= 0 ? a : b;
}

export function compareScores(a: ScoreInput, b: ScoreInput, better: Better): number {
  const av = a.primary * 100000 + (a.secondary ?? 0);
  const bv = b.primary * 100000 + (b.secondary ?? 0);
  return better === "lower" ? av - bv : bv - av;
}

export function parseScore(kind: ScoreKind, value: string, secondary?: string): ScoreInput {
  if (kind === "time") return { primary: parseTimeToSeconds(value) };
  if (kind === "rounds_reps") return parseRoundsReps(value);
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error("score must be a non-negative number");
  return { primary: n, secondary: secondary ? Number(secondary) : null };
}

function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}
