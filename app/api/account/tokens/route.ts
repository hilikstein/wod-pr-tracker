import { apiUser, handle } from "@/lib/auth";
import { logEvent } from "@/lib/db";
import { createApiToken } from "@/lib/tokens";

export const POST = handle(async (req: Request) => {
  const user = await apiUser(req);
  const body = (await req.json()) as { label?: string };
  const { token, row } = createApiToken(user.id, String(body.label ?? ""));
  logEvent("auth", `api token "${row.label}" created by ${user.username}`);
  return Response.json({ token, row });
});
