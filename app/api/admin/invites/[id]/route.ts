import { apiAdmin, handle } from "@/lib/auth";
import { logEvent } from "@/lib/db";
import { revokeInvite } from "@/lib/users";

export const DELETE = handle(async (req: Request, ctx: RouteContext<"/api/admin/invites/[id]">) => {
  const admin = await apiAdmin(req);
  const { id } = await ctx.params;
  revokeInvite(Number(id));
  logEvent("admin", `${admin.username} revoked invite ${id}`);
  return Response.json({ ok: true });
});
