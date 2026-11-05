import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { checkOrigin, config, handle, rateLimit, startSession, takeChallenge } from "@/lib/auth";
import { logEvent } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { redeemInvite } from "@/lib/users";

export const POST = handle(async (req: Request) => {
  checkOrigin(req);
  rateLimit(req, "invite", 20, 10 * 60_000);
  const { token, response } = (await req.json()) as { token?: string; response: RegistrationResponseJSON };
  const { challenge, data } = await takeChallenge<{ username: string; handle: string }>("register");
  const v = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: config.origin,
    expectedRPID: config.rpId,
    requireUserVerification: false,
  }).catch((e: Error) => {
    console.warn(`[auth] passkey registration error: ${e.message}`);
    throw new HttpError(400, "passkey not verified");
  });
  if (!v.verified) throw new HttpError(400, "passkey not verified");
  const c = v.registrationInfo.credential;
  const user = redeemInvite(String(token ?? ""), {
    username: data.username,
    handle: data.handle,
    credential: { id: c.id, publicKey: c.publicKey, counter: c.counter, transports: c.transports, label: req.headers.get("user-agent")?.slice(0, 120) ?? null },
  });
  logEvent("auth", `invite redeemed with passkey by ${user.username}`);
  await startSession(user.id);
  return Response.json({ ok: true });
});
