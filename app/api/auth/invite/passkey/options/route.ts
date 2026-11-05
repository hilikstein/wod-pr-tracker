import { generateRegistrationOptions } from "@simplewebauthn/server";
import { checkOrigin, config, handle, rateLimit, saveChallenge } from "@/lib/auth";
import { HttpError } from "@/lib/http";
import { getUser, getUserByUsername, listCredentials, newHandle, normalizeUsername, openInvite } from "@/lib/users";

export const POST = handle(async (req: Request) => {
  checkOrigin(req);
  rateLimit(req, "invite", 20, 10 * 60_000);
  const body = (await req.json()) as { token?: string; username?: string };
  const invite = openInvite(String(body.token ?? ""));
  if (!invite) throw new HttpError(404, "this invite is invalid, used or expired");
  let username: string;
  let handleValue: string;
  let existing: Array<{ id: string; transports: string | null }> = [];
  if (invite.kind === "signup") {
    username = normalizeUsername(body.username);
    if (getUserByUsername(username)) throw new HttpError(409, "that username is taken");
    handleValue = newHandle();
  } else {
    const user = getUser(invite.user_id!)!;
    username = user.username;
    handleValue = user.handle;
    existing = listCredentials(user.id);
  }
  const options = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpId,
    userName: username,
    userDisplayName: username,
    userID: new TextEncoder().encode(handleValue),
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({ id: c.id, transports: c.transports ? JSON.parse(c.transports) : undefined })),
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });
  await saveChallenge(options.challenge, "register", { username, handle: handleValue });
  return Response.json(options);
});
