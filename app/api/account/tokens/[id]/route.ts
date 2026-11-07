import { apiUser, handle } from "@/lib/auth";
import { logEvent } from "@/lib/db";
import { revokeApiToken } from "@/lib/tokens";

export const DELETE = handle(async (req: Request, ctx: RouteContext<"/api/account/tokens/[id]">) => {
  const user = await apiUser(req);
  const { id } = await ctx.params;
  revokeApiToken(user.id, Number(id));
  logEvent("auth", `api token ${id} revoked by ${user.username}`);
  return Response.json({ ok: true });
});
