import { apiUser, handle, sessionToken } from "@/lib/auth";
import { logEvent } from "@/lib/db";
import { changePassword, revokeSessions } from "@/lib/users";

export const POST = handle(async (req: Request) => {
  const user = await apiUser(req);
  const body = (await req.json()) as { current?: string; next?: string };
  await changePassword(user.id, body.current ? String(body.current) : null, String(body.next ?? ""));
  revokeSessions(user.id, await sessionToken());
  logEvent("auth", `password changed by ${user.username}`);
  return Response.json({ ok: true });
});
