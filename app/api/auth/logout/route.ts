import { checkOrigin, endSession, handle } from "@/lib/auth";

export const POST = handle(async (req: Request) => {
  checkOrigin(req);
  await endSession();
  return Response.json({ ok: true });
});
