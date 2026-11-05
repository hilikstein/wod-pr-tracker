import { apiAdmin, BASE_PATH, config, handle } from "@/lib/auth";
import { logEvent } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { createInvite, getUser } from "@/lib/users";

// A one-time link that lets the user set a new password or add a passkey. Opening it signs out their other sessions.
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/admin/users/[id]/recovery">) => {
  const admin = await apiAdmin(req);
  const { id } = await ctx.params;
  const target = getUser(Number(id));
  if (!target) throw new HttpError(404, "user not found");
  const invite = createInvite({ createdBy: admin.id, kind: "recovery", userId: target.id, note: `recovery for ${target.username}`, ttlDays: 1 });
  logEvent("admin", `${admin.username} created a recovery link for ${target.username}`);
  return Response.json({ id: invite.id, expires_at: invite.expires_at, link: `${config.origin}${BASE_PATH}/invite/${invite.token}` });
});
