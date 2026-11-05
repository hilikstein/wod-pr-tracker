"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FavoriteButton } from "./FavoriteButton";
import type { MovementSummary } from "@/lib/db";
import { formatScore } from "@/lib/score";

export function MovementSearchList({ movements, empty }: { movements: MovementSummary[]; empty: string }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = norm(q);
    return movements.filter((m) => !needle || [m.name, m.id, ...m.aliases].some((s) => norm(s).includes(needle)));
  }, [q, movements]);
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="kicker">Search</span>
        <input className="input mt-1" placeholder="Type a name" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {filtered.length === 0 ? <p className="text-sm text-muted">{empty}</p> : filtered.map((m) => <MovementCard key={m.id} movement={m} />)}
    </div>
  );
}

function MovementCard({ movement }: { movement: MovementSummary }) {
  return (
    <div className="card flex items-center gap-3">
      <Link href={`/m/${movement.id}`} className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="display truncate text-[1.35rem] leading-none">{movement.name}</h2>
          <span className="kicker shrink-0 text-[0.62rem] text-muted">{movement.group}</span>
        </div>
        <div className={scoreClass(movement)}>{summary(movement)}</div>
      </Link>
      <FavoriteButton movementId={movement.id} initial={movement.favorite} />
    </div>
  );
}

function scoreClass(m: MovementSummary) {
  const has = m.group === "lift" ? !!(m.pb1 || m.pb3 || m.pb5) : !!m.pb;
  return has ? "score mt-2 text-[1.05rem] text-accent-soft" : "mt-2 text-[1.05rem] text-muted";
}

function summary(m: MovementSummary) {
  if (m.group === "lift") {
    const one = m.pb1 ? formatScore(m.scoreKind, { primary: m.pb1.score_primary, secondary: m.pb1.score_secondary }) + (m.pb1.scaled ? " scaled" : "") : "—";
    const three = m.pb3 ? formatScore(m.scoreKind, { primary: m.pb3.score_primary, secondary: m.pb3.score_secondary }) + (m.pb3.scaled ? " scaled" : "") : "—";
    const five = m.pb5 ? formatScore(m.scoreKind, { primary: m.pb5.score_primary, secondary: m.pb5.score_secondary }) + (m.pb5.scaled ? " scaled" : "") : "—";
    return `1RM ${one}  ·  3RM ${three}  ·  5RM ${five}`;
  }
  if (!m.pb) return "No result yet";
  return `${formatScore(m.scoreKind, { primary: m.pb.score_primary, secondary: m.pb.score_secondary })}${m.pb.scaled ? "  ·  scaled" : ""}  ·  ${m.pb.performed_on}`;
}

function norm(s: string) {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}
