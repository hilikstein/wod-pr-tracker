import { generateRegistrationOptions } from "@simplewebauthn/server";
import { apiUser, config, handle, saveChallenge } from "@/lib/auth";
import { listCredentials } from "@/lib/users";

export const POST = handle(async (req: Request) => {
  const user = await apiUser(req);
  const options = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpId,
    userName: user.username,
    userDisplayName: user.username,
    userID: new TextEncoder().encode(user.handle),
    attestationType: "none",
    excludeCredentials: listCredentials(user.id).map((c) => ({ id: c.id, transports: c.transports ? JSON.parse(c.transports) : undefined })),
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });
  await saveChallenge(options.challenge, "add");
  return Response.json(options);
});
