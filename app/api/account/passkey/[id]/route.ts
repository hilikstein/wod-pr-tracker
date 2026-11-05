import { apiUser, handle } from "@/lib/auth";
import { logEvent } from "@/lib/db";
import { deleteCredential } from "@/lib/users";

export const DELETE = handle(async (req: Request, ctx: RouteContext<"/api/account/passkey/[id]">) => {
  const user = await apiUser(req);
  const { id } = await ctx.params;
  deleteCredential(user.id, id);
  logEvent("auth", `passkey removed by ${user.username}`);
  return Response.json({ ok: true });
});
