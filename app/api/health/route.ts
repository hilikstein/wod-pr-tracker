import { db } from "@/lib/db";

// Unauthenticated liveness check for the cron alert. Reveals nothing beyond "the database answers".
export async function GET() {
  try {
    db().prepare("SELECT 1").get();
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[health] database check failed", e);
    return Response.json({ ok: false }, { status: 503 });
  }
}
