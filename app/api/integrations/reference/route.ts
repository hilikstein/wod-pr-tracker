import { handle } from "@/lib/auth";
import { HttpError } from "@/lib/http";
import { referenceFor } from "@/lib/reference";
import { bearerToken, userForApiToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  const user = userForApiToken(bearerToken(req));
  if (!user) throw new HttpError(401, "invalid token");
  return Response.json(referenceFor(user.id));
});
