import { checkOrigin, handle, rateLimit, rateLimitAccount, startSession } from "@/lib/auth";
import { HttpError } from "@/lib/http";
import { authenticate, normalizeUsername, touchLogin } from "@/lib/users";

export const POST = handle(async (req: Request) => {
  checkOrigin(req);
  rateLimit(req, "login", 40, 10 * 60_000);
  const body = (await req.json()) as { username?: string; password?: string };
  if (typeof body.password !== "string" || body.password.length === 0 || body.password.length > 256) throw new HttpError(400, "password is required");
  let username: string;
  try {
    username = normalizeUsername(body.username);
  } catch {
    throw new HttpError(401, "wrong username or password");
  }
  rateLimitAccount(username);
  const user = await authenticate(username, body.password);
  touchLogin(user.id);
  await startSession(user.id);
  return Response.json({ ok: true });
});
