import { apiUser, handle } from "@/lib/auth";
import { setFavorite } from "@/lib/db";

export const POST = handle(async (req: Request) => {
  const user = await apiUser(req);
  const body = await req.json();
  setFavorite(user.id, String(body.movement_id ?? ""), Boolean(body.favorite));
  return Response.json({ ok: true });
});
