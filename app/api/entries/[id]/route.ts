import { apiUser, handle } from "@/lib/auth";
import { deleteEntry, updateEntry } from "@/lib/db";

export const PATCH = handle(async (req: Request, ctx: RouteContext<"/api/entries/[id]">) => {
  const user = await apiUser(req);
  const { id } = await ctx.params;
  const body = await req.json();
  const entry = updateEntry(user.id, Number(id), {
    performed_on: body.performed_on == null ? undefined : String(body.performed_on),
    lift_reps: body.lift_reps === undefined ? undefined : (body.lift_reps == null ? null : Number(body.lift_reps)),
    score_primary: body.score_primary == null ? undefined : Number(body.score_primary),
    score_secondary: body.score_secondary === undefined ? undefined : (body.score_secondary == null || body.score_secondary === "" ? null : Number(body.score_secondary)),
    rx: body.rx === undefined ? undefined : (body.rx ? 1 : 0),
    adaptations: body.adaptations == null ? undefined : String(body.adaptations),
    notes: body.notes == null ? undefined : String(body.notes),
  });
  return Response.json({ entry });
});

export const DELETE = handle(async (req: Request, ctx: RouteContext<"/api/entries/[id]">) => {
  const user = await apiUser(req);
  const { id } = await ctx.params;
  deleteEntry(user.id, Number(id));
  return Response.json({ ok: true });
});
