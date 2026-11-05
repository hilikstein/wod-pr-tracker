import { checkOrigin, handle, rateLimit, startSession } from "@/lib/auth";
import { logEvent } from "@/lib/db";
import { hashPassword, validatePassword } from "@/lib/password";
import { redeemInvite } from "@/lib/users";

// Redeems an invite with a password: creates the account (signup invite) or sets a new password (recovery invite).
export const POST = handle(async (req: Request) => {
  checkOrigin(req);
  rateLimit(req, "invite", 20, 10 * 60_000);
  const body = (await req.json()) as { token?: string; username?: string; password?: string };
  const password = String(body.password ?? "");
  validatePassword(password);
  const user = redeemInvite(String(body.token ?? ""), { username: body.username, passwordHash: await hashPassword(password) });
  logEvent("auth", `invite redeemed with password by ${user.username}`);
  await startSession(user.id);
  return Response.json({ ok: true });
});
