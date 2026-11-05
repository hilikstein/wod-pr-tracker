import { MovementSearchList } from "@/components/MovementSearchList";
import { CustomMovementForm } from "@/components/CustomMovementForm";
import { PageHero } from "@/components/PageHero";
import { pageUser } from "@/lib/auth";
import { summaries } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function BenchmarksPage() {
  const user = await pageUser();
  const movements = summaries(user.id, "benchmark");
  return (
    <main>
      <PageHero
        image="benchmarks.jpg"
        kicker="Named WODs"
        title="Benchmarks"
        lede="Girls, heroes, and the tests that still live on the whiteboard."
      />
      <div className="page-body space-y-5">
        <CustomMovementForm group="benchmark" />
        <MovementSearchList movements={movements} empty="No matching benchmark." />
      </div>
    </main>
  );
}
