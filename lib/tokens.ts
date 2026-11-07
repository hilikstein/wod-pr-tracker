import { db, nowIso } from "./db.ts";
import { HttpError } from "./http.ts";
import { getUser, randomToken, sha256, type User } from "./users.ts";

// Read-only API tokens, one user each. The token is shown once at creation; only its hash is stored.
// They authenticate exactly one thing: GET /api/integrations/reference (see lib/reference.ts).

export type ApiToken = { id: number; label: string; created_at: string; last_used_at: string | null };

const MAX_TOKENS = 10;

export function createApiToken(userId: number, label: string): { token: string; row: ApiToken } {
  const name = label.trim();
  if (!name) throw new HttpError(400, "a label is required, e.g. the name of the app that will use the token");
  if (name.length > 60) throw new HttpError(400, "label must be at most 60 characters");
  const count = (db().prepare("SELECT COUNT(*) c FROM api_tokens WHERE user_id = ?").get(userId) as { c: number }).c;
  if (count >= MAX_TOKENS) throw new HttpError(400, `at most ${MAX_TOKENS} tokens per user`);
  const token = `pbt_${randomToken()}`;
  const now = nowIso();
  const res = db().prepare("INSERT INTO api_tokens (user_id, token_hash, label, created_at) VALUES (?,?,?,?)").run(userId, sha256(token), name, now);
  return { token, row: { id: Number(res.lastInsertRowid), label: name, created_at: now, last_used_at: null } };
}

export function listApiTokens(userId: number): ApiToken[] {
  return db().prepare("SELECT id, label, created_at, last_used_at FROM api_tokens WHERE user_id = ? ORDER BY id").all(userId) as ApiToken[];
}

export function revokeApiToken(userId: number, id: number) {
  const res = db().prepare("DELETE FROM api_tokens WHERE id = ? AND user_id = ?").run(id, userId);
  if (res.changes !== 1) throw new HttpError(404, "token not found");
}

/** The user a token belongs to, or undefined. A disabled user's tokens stop working. */
export function userForApiToken(token: string): User | undefined {
  const row = db().prepare("SELECT id, user_id FROM api_tokens WHERE token_hash = ?").get(sha256(token)) as { id: number; user_id: number } | undefined;
  if (!row) return undefined;
  const user = getUser(row.user_id);
  if (!user || user.disabled_at) return undefined;
  db().prepare("UPDATE api_tokens SET last_used_at = ? WHERE id = ?").run(nowIso(), row.id);
  return user;
}

export function bearerToken(req: Request): string {
  const h = req.headers.get("authorization") ?? "";
  const m = h.match(/^Bearer (\S+)$/);
  if (!m) throw new HttpError(401, "missing bearer token");
  return m[1];
}
