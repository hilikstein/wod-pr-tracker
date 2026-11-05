import { apiAdmin, BASE_PATH, config, handle } from "@/lib/auth";
import { logEvent } from "@/lib/db";
import { createInvite, listInvites } from "@/lib/users";

export const GET = handle(async (req: Request) => {
  await apiAdmin(req);
  return Response.json({ invites: listInvites() });
});

// The link is returned once, here. Only its hash is stored.
export const POST = handle(async (req: Request) => {
  const admin = await apiAdmin(req);
  const body = (await req.json()) as { note?: string; ttl_days?: number };
  const invite = createInvite({ createdBy: admin.id, note: body.note, ttlDays: body.ttl_days === undefined ? undefined : Number(body.ttl_days) });
  logEvent("admin", `${admin.username} created invite ${invite.id}`);
  return Response.json({ id: invite.id, expires_at: invite.expires_at, link: `${config.origin}${BASE_PATH}/invite/${invite.token}` });
});
