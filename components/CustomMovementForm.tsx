"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";
import type { MovementGroup, ScoreKind } from "@/lib/catalog";

export function CustomMovementForm({ group }: { group: MovementGroup }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scoreKind, setScoreKind] = useState<ScoreKind>(group === "lift" ? "weight" : "time");
  const [prescription, setPrescription] = useState("");
  const [err, setErr] = useState<string | null>(null);
  if (!open) {
    return (
      <button className="btn-ghost w-full" onClick={() => setOpen(true)}>
        Add custom {group === "lift" ? "lift" : "benchmark"}
      </button>
    );
  }
  return (
    <form className="card space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      setErr(null);
      try {
        const res = await api<{ movement: { id: string } }>("/api/movements", "POST", { name, group, score_kind: scoreKind, prescription });
        router.push(`/m/${res.movement.id}`);
        router.refresh();
      } catch (error) {
        setErr((error as Error).message);
      }
    }}>
      <h2 className="display text-lg">Add custom {group === "lift" ? "lift" : "benchmark"}</h2>
      <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      {group === "benchmark" && (
        <select className="input" value={scoreKind} onChange={(e) => setScoreKind(e.target.value as ScoreKind)}>
          <option value="time">Time</option>
          <option value="reps">Reps</option>
          <option value="rounds_reps">Rounds + reps</option>
          <option value="points">Points</option>
          <option value="weight">Weight</option>
        </select>
      )}
      <textarea className="input min-h-20" placeholder="Prescription or notes" value={prescription} onChange={(e) => setPrescription(e.target.value)} />
      {err && <p className="text-sm text-bad">{err}</p>}
      <div className="flex gap-2">
        <button className="btn-primary flex-1">Save custom movement</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
