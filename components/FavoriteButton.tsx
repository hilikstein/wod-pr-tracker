"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "./api";
import { IconStar } from "./Icons";

export function FavoriteButton({ movementId, initial }: { movementId: string; initial: boolean }) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <button
      aria-label={favorite ? "Remove favorite" : "Mark favorite"}
      className={`flex h-11 w-11 items-center justify-center ${favorite ? "text-accent" : "text-muted"}`}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const next = !favorite;
        await api("/api/favorites", "POST", { movement_id: movementId, favorite: next });
        setFavorite(next);
        setBusy(false);
        router.refresh();
      }}
    >
      <span className="w-5">
        <IconStar filled={favorite} />
      </span>
    </button>
  );
}
