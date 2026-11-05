import { apiUser, handle } from "@/lib/auth";
import { exportAll } from "@/lib/db";

// Everything the signed-in user has stored, as JSON.
export const GET = handle(async (req: Request) => {
  const user = await apiUser(req);
  return new Response(JSON.stringify({ username: user.username, ...exportAll(user.id) }, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="wod-pr-tracker-${user.username}.json"` },
  });
});
