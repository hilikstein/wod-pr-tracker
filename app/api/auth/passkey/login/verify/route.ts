import { verifyAuthenticationResponse, type AuthenticationResponseJSON } from "@simplewebauthn/server";
import { checkOrigin, config, handle, rateLimit, startSession, takeChallenge } from "@/lib/auth";
import { db, nowIso } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { getUser, touchLogin } from "@/lib/users";

export const POST = handle(async (req: Request) => {
  checkOrigin(req);
  rateLimit(req, "login", 40, 10 * 60_000);
  const response = (await req.json()) as AuthenticationResponseJSON;
  const { challenge } = await takeChallenge("login");
  const cred = db().prepare("SELECT * FROM credentials WHERE id = ?").get(String(response?.id ?? "")) as
    | { id: string; user_id: number; public_key: Buffer; counter: number; transports: string | null } | undefined;
  if (!cred) {
    console.warn("[auth] login with unknown passkey");
    throw new HttpError(401, "unknown passkey");
  }
  const v = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: config.origin,
    expectedRPID: config.rpId,
    requireUserVerification: false,
    credential: {
      id: cred.id,
      publicKey: new Uint8Array(cred.public_key),
      counter: cred.counter,
      transports: cred.transports ? JSON.parse(cred.transports) : undefined,
    },
  }).catch((e: Error) => {
    console.warn(`[auth] passkey verification error: ${e.message}`);
    throw new HttpError(401, "passkey not verified");
  });
  if (!v.verified) throw new HttpError(401, "passkey not verified");
  const user = getUser(cred.user_id);
  if (!user || user.disabled_at) throw new HttpError(401, "passkey not verified");
  db().prepare("UPDATE credentials SET counter = ?, last_used_at = ? WHERE id = ?").run(v.authenticationInfo.newCounter, nowIso(), cred.id);
  touchLogin(user.id);
  await startSession(user.id);
  return Response.json({ ok: true });
});
