import { notFound } from "next/navigation";
import { MovementDetailClient } from "@/components/MovementDetailClient";
import { PageHero } from "@/components/PageHero";
import { pageUser } from "@/lib/auth";
import { entriesFor, getMovement, isFavorite, summarize } from "@/lib/db";
import { movementHero } from "@/lib/photos";

export const dynamic = "force-dynamic";

export default async function MovementPage({ params }: PageProps<"/m/[id]">) {
  const { id } = await params;
  const user = await pageUser();
  const movement = getMovement(user.id, id);
  if (!movement) notFound();
  const entries = entriesFor(user.id, movement.id);
  const summary = summarize(user.id, movement, isFavorite(user.id, movement.id));
  return (
    <main>
      <PageHero
        image={movementHero(movement)}
        kicker={movement.group === "lift" ? "Lift" : movement.family === "heroes" ? "Hero" : movement.family === "girls" ? "The Girls" : "Benchmark"}
        title={movement.name}
        backHref={movement.group === "lift" ? "/lifts" : "/benchmarks"}
      />
      <div className="page-body space-y-4">
        <MovementDetailClient movement={movement} entries={entries} favorite={summary.favorite} pb={summary.pb ?? null} pb1={summary.pb1 ?? null} pb3={summary.pb3 ?? null} pb5={summary.pb5 ?? null} />
      </div>
    </main>
  );
}
