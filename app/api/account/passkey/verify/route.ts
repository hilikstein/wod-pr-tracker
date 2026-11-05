import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { apiUser, config, handle, takeChallenge } from "@/lib/auth";
import { logEvent } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { addCredential } from "@/lib/users";

export const POST = handle(async (req: Request) => {
  const user = await apiUser(req);
  const response = (await req.json()) as RegistrationResponseJSON;
  const { challenge } = await takeChallenge("add");
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
  addCredential(user.id, { id: c.id, publicKey: c.publicKey, counter: c.counter, transports: c.transports, label: req.headers.get("user-agent")?.slice(0, 120) ?? null });
  logEvent("auth", `passkey added by ${user.username}`);
  return Response.json({ ok: true });
});
