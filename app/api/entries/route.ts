import { apiUser, handle } from "@/lib/auth";
import { addEntry, entriesFor, getMovement } from "@/lib/db";
import { HttpError } from "@/lib/http";

export const GET = handle(async (req: Request) => {
  const user = await apiUser(req);
  const movementId = new URL(req.url).searchParams.get("movement_id");
  if (!movementId) throw new HttpError(400, "movement_id is required");
  return Response.json({ entries: entriesFor(user.id, movementId) });
});

export const POST = handle(async (req: Request) => {
  const user = await apiUser(req);
  const body = await req.json();
  const movementId = String(body.movement_id ?? "");
  if (!getMovement(user.id, movementId)) throw new HttpError(404, "movement not found");
  const entry = addEntry(user.id, {
    movement_id: movementId,
    performed_on: String(body.performed_on ?? ""),
    lift_reps: body.lift_reps == null ? null : Number(body.lift_reps),
    score_primary: Number(body.score_primary),
    score_secondary: body.score_secondary == null || body.score_secondary === "" ? null : Number(body.score_secondary),
    rx: body.rx ? 1 : 0,
    adaptations: String(body.adaptations ?? ""),
    notes: String(body.notes ?? ""),
  });
  return Response.json({ entry });
});
