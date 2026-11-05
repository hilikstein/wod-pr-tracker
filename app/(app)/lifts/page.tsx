import { MovementSearchList } from "@/components/MovementSearchList";
import { CustomMovementForm } from "@/components/CustomMovementForm";
import { PageHero } from "@/components/PageHero";
import { pageUser } from "@/lib/auth";
import { summaries } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LiftsPage() {
  const user = await pageUser();
  const movements = summaries(user.id, "lift");
  return (
    <main>
      <PageHero
        image="lifts.jpg"
        kicker="Strength"
        title="Lifts"
        lede="One bar. Three histories. 1RM, 3RM and 5RM, kept apart on purpose."
      />
      <div className="page-body space-y-5">
        <CustomMovementForm group="lift" />
        <MovementSearchList movements={movements} empty="No matching lift." />
      </div>
    </main>
  );
}
