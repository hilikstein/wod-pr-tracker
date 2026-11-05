import { apiAdmin, handle } from "@/lib/auth";
import { logEvent } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { getUser, setDisabled } from "@/lib/users";

export const PATCH = handle(async (req: Request, ctx: RouteContext<"/api/admin/users/[id]">) => {
  const admin = await apiAdmin(req);
  const { id } = await ctx.params;
  const target = getUser(Number(id));
  if (!target) throw new HttpError(404, "user not found");
  if (target.id === admin.id) throw new HttpError(409, "you cannot disable your own account");
  const body = (await req.json()) as { disabled?: boolean };
  if (typeof body.disabled !== "boolean") throw new HttpError(400, "disabled must be true or false");
  setDisabled(target.id, body.disabled);
  logEvent("admin", `${admin.username} ${body.disabled ? "disabled" : "enabled"} ${target.username}`);
  return Response.json({ ok: true });
});
