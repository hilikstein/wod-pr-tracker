import type { Movement } from "./catalog";

export function movementHero(movement: Movement): string {
  if (movement.group === "lift" && !movement.id.startsWith("custom-")) return `lifts/${movement.id}.jpg`;
  if (movement.group === "lift") return "lifts.jpg";
  return "benchmarks.jpg";
}
