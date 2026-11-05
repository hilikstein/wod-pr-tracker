import { MovementSearchList } from "@/components/MovementSearchList";
import { PageHero } from "@/components/PageHero";
import { pageUser } from "@/lib/auth";
import { summaries } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const user = await pageUser();
  const movements = summaries(user.id, "all", true);
  return (
    <main>
      <PageHero
        image="favorites.jpg"
        kicker="The board"
        title="Favorites"
        lede="The lifts and named pieces you keep checking after class."
      />
      <div className="page-body space-y-5">
        <MovementSearchList movements={movements} empty="No favorites yet. Star movements from Benchmarks or Lifts." />
      </div>
    </main>
  );
}
