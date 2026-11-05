import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { checkOrigin, config, handle, rateLimit, saveChallenge } from "@/lib/auth";

export const POST = handle(async (req: Request) => {
  checkOrigin(req);
  rateLimit(req, "login", 40, 10 * 60_000);
  const options = await generateAuthenticationOptions({ rpID: config.rpId, userVerification: "preferred" });
  await saveChallenge(options.challenge, "login");
  return Response.json(options);
});
