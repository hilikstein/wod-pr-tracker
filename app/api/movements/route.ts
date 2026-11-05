import { apiUser, handle } from "@/lib/auth";
import { createCustomMovement } from "@/lib/db";
import { HttpError } from "@/lib/http";

export const POST = handle(async (req: Request) => {
  const user = await apiUser(req);
  const body = await req.json();
  const group = body.group === "lift" ? "lift" : body.group === "benchmark" ? "benchmark" : null;
  if (!group) throw new HttpError(400, "group must be benchmark or lift");
  const scoreKind = String(body.score_kind ?? "");
  if (!["time", "reps", "rounds_reps", "weight", "points"].includes(scoreKind)) throw new HttpError(400, "invalid score kind");
  const movement = createCustomMovement(user.id, {
    name: String(body.name ?? ""),
    group,
    scoreKind: scoreKind as never,
    prescription: String(body.prescription ?? ""),
    liftReps: group === "lift" ? [1, 3, 5] : [],
  });
  return Response.json({ movement });
});
