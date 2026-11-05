import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, nowIso } from "./db.ts";
import { HttpError } from "./http.ts";
import { site } from "./site.ts";
import { createSession, deleteSession, sessionUser, type User } from "./users.ts";

export { HttpError };

export const BASE_PATH = site.basePath;
const COOKIE_PATH = BASE_PATH || "/";
const SESSION_COOKIE = `${site.key}_session`;
const CHALLENGE_COOKIE = `${site.key}_challenge`;
const CHALLENGE_TTL_MS = 5 * 60_000;

// Read on use, not at import: the build has no runtime environment. Missing values fail loudly.
export const config = {
  get origin() { return required("ORIGIN"); },
  get rpId() { return process.env.RP_ID || new URL(required("ORIGIN")).hostname; },
  rpName: site.name,
};

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

const secureCookies = () => config.origin.startsWith("https://");

// ---- Who is asking -----------------------------------------------------------------------------

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return sessionUser(token) ?? null;
}

/** For pages: redirect to login when there is no valid session. */
export async function pageUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function pageAdmin(): Promise<User> {
  const user = await pageUser();
  if (user.role !== "admin") redirect("/");
  return user;
}

/** For API routes. Mutations also get an Origin check against cross-site requests. */
export async function apiUser(req: Request): Promise<User> {
  if (req.method !== "GET" && req.method !== "HEAD") checkOrigin(req);
  const user = await currentUser();
  if (!user) throw new HttpError(401, "not signed in");
  return user;
}

export async function apiAdmin(req: Request): Promise<User> {
  const user = await apiUser(req);
  if (user.role !== "admin") throw new HttpError(403, "admin only");
  return user;
}

export function checkOrigin(req: Request) {
  if (req.headers.get("origin") !== config.origin) throw new HttpError(403, "bad origin");
}

export async function sessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function startSession(userId: number) {
  const { token, expires } = createSession(userId);
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: COOKIE_PATH, expires });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(token);
  jar.delete({ name: SESSION_COOKIE, path: COOKIE_PATH });
}

// ---- WebAuthn challenges (single use, may carry a payload) ---------------------------------------

type Purpose = "register" | "login" | "add";

export async function saveChallenge(challenge: string, purpose: Purpose, data?: unknown) {
  const id = crypto.randomUUID();
  db().prepare("DELETE FROM challenges WHERE expires_at < ?").run(nowIso());
  db().prepare("INSERT INTO challenges (id, challenge, purpose, data, expires_at) VALUES (?,?,?,?,?)")
    .run(id, challenge, purpose, data === undefined ? null : JSON.stringify(data), new Date(Date.now() + CHALLENGE_TTL_MS).toISOString());
  (await cookies()).set(CHALLENGE_COOKIE, id, {
    httpOnly: true, secure: secureCookies(), sameSite: "strict", path: `${BASE_PATH}/api`, maxAge: CHALLENGE_TTL_MS / 1000,
  });
}

export async function takeChallenge<T = undefined>(purpose: Purpose): Promise<{ challenge: string; data: T }> {
  const jar = await cookies();
  const id = jar.get(CHALLENGE_COOKIE)?.value;
  jar.delete({ name: CHALLENGE_COOKIE, path: `${BASE_PATH}/api` });
  if (!id) throw new HttpError(400, "challenge missing");
  const row = db().prepare("SELECT * FROM challenges WHERE id = ?").get(id) as { challenge: string; purpose: string; data: string | null; expires_at: string } | undefined;
  db().prepare("DELETE FROM challenges WHERE id = ?").run(id);
  if (!row || row.purpose !== purpose || row.expires_at < nowIso()) throw new HttpError(400, "challenge expired");
  return { challenge: row.challenge, data: (row.data ? JSON.parse(row.data) : undefined) as T };
}

// ---- Rate limiting for unauthenticated endpoints (in-memory) -----------------------------------

const hits = new Map<string, number[]>();

function hit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 10_000) for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  return list.length > max;
}

/** Per client address. Behind a reverse proxy the proxy must set X-Forwarded-For. */
export function rateLimit(req: Request, bucket: string, max: number, windowMs: number) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (hit(`${bucket}:ip:${ip}`, max, windowMs)) {
    console.warn(`[auth] rate limit hit bucket=${bucket} ip=${ip}`);
    throw new HttpError(429, "too many attempts, try again later");
  }
}

/** Per account name, so a distributed guesser still hits a wall. Counts attempts, not failures. */
export function rateLimitAccount(username: string, max = 10, windowMs = 15 * 60_000) {
  if (hit(`login:user:${username}`, max, windowMs)) {
    console.warn(`[auth] account rate limit hit user=${username}`);
    throw new HttpError(429, "too many attempts, try again later");
  }
}

/** Wrap a route handler: HttpError -> JSON status, anything else -> JSON 500. */
export function handle<A extends unknown[]>(fn: (req: Request, ...rest: A) => Promise<Response>) {
  return async (req: Request, ...rest: A): Promise<Response> => {
    try {
      return await fn(req, ...rest);
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      console.error(`[api] ${req.method} ${new URL(req.url).pathname} failed`, e);
      return Response.json({ error: "server error" }, { status: 500 });
    }
  };
}
