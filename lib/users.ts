import crypto from "node:crypto";
import { db, nowIso } from "./db.ts";
import { HttpError } from "./http.ts";
import { hashPassword, spendVerifyTime, validatePassword, verifyPassword } from "./password.ts";

export type Role = "admin" | "member";
export type User = {
  id: number;
  username: string;
  role: Role;
  handle: string;
  has_password: boolean;
  created_at: string;
  last_login_at: string | null;
  disabled_at: string | null;
};
export type Invite = {
  id: number;
  kind: "signup" | "recovery";
  role: Role;
  user_id: number | null;
  note: string;
  created_by: number | null;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by: number | null;
  revoked_at: string | null;
};
export type NewCredential = { id: string; publicKey: Uint8Array; counter: number; transports?: string[]; label?: string | null };

export const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
export const randomToken = () => crypto.randomBytes(32).toString("base64url");

const SESSION_DAYS = 180;
const USER_COLUMNS = "id, username, role, handle, (password_hash IS NOT NULL) AS has_password, created_at, last_login_at, disabled_at";

function toUser(row: unknown): User | undefined {
  if (!row) return undefined;
  const r = row as Omit<User, "has_password"> & { has_password: number };
  return { ...r, has_password: r.has_password === 1 };
}

// ---- Users ------------------------------------------------------------------------------------

export function normalizeUsername(raw: unknown): string {
  const u = String(raw ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._@+-]{2,63}$/.test(u)) {
    throw new HttpError(400, "username must be 3-64 characters: letters, digits and . _ @ + - (an email address works)");
  }
  return u;
}

export function getUser(id: number): User | undefined {
  return toUser(db().prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).get(id));
}

export function getUserByUsername(username: string): User | undefined {
  return toUser(db().prepare(`SELECT ${USER_COLUMNS} FROM users WHERE username = ?`).get(username));
}

export function userByHandle(handle: string): User | undefined {
  return toUser(db().prepare(`SELECT ${USER_COLUMNS} FROM users WHERE handle = ?`).get(handle));
}

export function listUsers(): Array<User & { entries: number }> {
  const rows = db().prepare(`SELECT ${USER_COLUMNS}, (SELECT COUNT(*) FROM entries e WHERE e.user_id = users.id) AS entries FROM users ORDER BY id`).all();
  return rows.map((r) => ({ ...toUser(r)!, entries: (r as { entries: number }).entries }));
}

export function newHandle(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function touchLogin(userId: number) {
  db().prepare("UPDATE users SET last_login_at = ? WHERE id = ?").run(nowIso(), userId);
}

/** Password login. Every failure is the same 401 and costs the same time, whatever the reason. */
export async function authenticate(username: string, password: string): Promise<User> {
  const row = db().prepare("SELECT id, password_hash, disabled_at FROM users WHERE username = ?").get(username) as
    | { id: number; password_hash: string | null; disabled_at: string | null } | undefined;
  if (!row || !row.password_hash) {
    await spendVerifyTime(password);
    throw new HttpError(401, "wrong username or password");
  }
  const ok = await verifyPassword(password, row.password_hash);
  if (!ok || row.disabled_at) throw new HttpError(401, "wrong username or password");
  return getUser(row.id)!;
}

export async function setPassword(userId: number, password: string) {
  validatePassword(password);
  db().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(await hashPassword(password), userId);
}

export async function changePassword(userId: number, current: string | null, next: string) {
  const row = db().prepare("SELECT password_hash FROM users WHERE id = ?").get(userId) as { password_hash: string | null } | undefined;
  if (!row) throw new HttpError(404, "user not found");
  if (row.password_hash) {
    if (!current || !(await verifyPassword(current, row.password_hash))) throw new HttpError(403, "current password is wrong");
  }
  await setPassword(userId, next);
}

export function setDisabled(userId: number, disabled: boolean) {
  const conn = db();
  conn.transaction(() => {
    if (disabled) {
      const admins = conn.prepare("SELECT COUNT(*) c FROM users WHERE role = 'admin' AND disabled_at IS NULL AND id <> ?").get(userId) as { c: number };
      const target = conn.prepare("SELECT role FROM users WHERE id = ?").get(userId) as { role: Role } | undefined;
      if (!target) throw new HttpError(404, "user not found");
      if (target.role === "admin" && admins.c === 0) throw new HttpError(409, "cannot disable the last active admin");
    }
    conn.prepare("UPDATE users SET disabled_at = ? WHERE id = ?").run(disabled ? nowIso() : null, userId);
    if (disabled) conn.prepare("DELETE FROM login_sessions WHERE user_id = ?").run(userId);
  })();
}

// ---- Sessions ---------------------------------------------------------------------------------

export function createSession(userId: number): { token: string; expires: Date } {
  const token = randomToken();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86400_000);
  db().prepare("INSERT INTO login_sessions (token_hash, user_id, created_at, expires_at) VALUES (?,?,?,?)").run(sha256(token), userId, now.toISOString(), expires.toISOString());
  db().prepare("DELETE FROM login_sessions WHERE expires_at < ?").run(now.toISOString());
  return { token, expires };
}

export function sessionUser(token: string): User | undefined {
  return toUser(db().prepare(
    `SELECT u.id, u.username, u.role, u.handle, (u.password_hash IS NOT NULL) AS has_password, u.created_at, u.last_login_at, u.disabled_at
     FROM login_sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ? AND u.disabled_at IS NULL`,
  ).get(sha256(token), nowIso()));
}

export function deleteSession(token: string) {
  db().prepare("DELETE FROM login_sessions WHERE token_hash = ?").run(sha256(token));
}

export function revokeSessions(userId: number, exceptToken?: string) {
  if (exceptToken) db().prepare("DELETE FROM login_sessions WHERE user_id = ? AND token_hash <> ?").run(userId, sha256(exceptToken));
  else db().prepare("DELETE FROM login_sessions WHERE user_id = ?").run(userId);
}

// ---- Invites ----------------------------------------------------------------------------------

export function createInvite(input: { createdBy: number | null; kind?: "signup" | "recovery"; role?: Role; userId?: number; note?: string; ttlDays?: number }) {
  const kind = input.kind ?? "signup";
  const ttl = input.ttlDays ?? 7;
  if (!Number.isFinite(ttl) || ttl < 1 || ttl > 90) throw new HttpError(400, "invite lifetime must be 1-90 days");
  const note = (input.note ?? "").trim();
  if (note.length > 120) throw new HttpError(400, "note must be at most 120 characters");
  if (kind === "recovery" && !input.userId) throw new Error("a recovery invite needs a user");
  if (kind === "signup" && input.userId) throw new Error("a signup invite cannot name a user");
  const token = randomToken();
  const now = new Date();
  const expires = new Date(now.getTime() + ttl * 86400_000);
  const res = db().prepare("INSERT INTO invites (token_hash, kind, role, user_id, note, created_by, created_at, expires_at) VALUES (?,?,?,?,?,?,?,?)")
    .run(sha256(token), kind, input.role ?? "member", kind === "recovery" ? input.userId! : null, note, input.createdBy, now.toISOString(), expires.toISOString());
  return { id: Number(res.lastInsertRowid), token, expires_at: expires.toISOString() };
}

/** An invite that can still be used: not used, not revoked, not expired. */
export function openInvite(token: string): (Invite & { username: string | null }) | undefined {
  return db().prepare(
    `SELECT i.*, u.username AS username FROM invites i LEFT JOIN users u ON u.id = i.user_id
     WHERE i.token_hash = ? AND i.used_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > ?`,
  ).get(sha256(token), nowIso()) as (Invite & { username: string | null }) | undefined;
}

export function listInvites(): Array<Invite & { username: string | null; used_by_name: string | null }> {
  return db().prepare(
    `SELECT i.*, t.username AS username, ub.username AS used_by_name FROM invites i
     LEFT JOIN users t ON t.id = i.user_id LEFT JOIN users ub ON ub.id = i.used_by ORDER BY i.id DESC LIMIT 200`,
  ).all() as Array<Invite & { username: string | null; used_by_name: string | null }>;
}

export function revokeInvite(id: number) {
  const res = db().prepare("UPDATE invites SET revoked_at = ? WHERE id = ? AND used_at IS NULL AND revoked_at IS NULL").run(nowIso(), id);
  if (res.changes !== 1) throw new HttpError(404, "invite not found or already used");
}

/**
 * Spends an invite. A signup invite creates the account; a recovery invite sets a new password and/or adds a
 * passkey to the existing account and signs out every other session of that user. One transaction: either the
 * invite is spent and the account changed, or nothing happened.
 */
export function redeemInvite(token: string, input: { username?: string; passwordHash?: string; credential?: NewCredential; handle?: string }): User {
  const conn = db();
  if (!input.passwordHash && !input.credential) throw new Error("redeem needs a password or a passkey");
  const userId = conn.transaction((): number => {
    const invite = openInvite(token);
    if (!invite) throw new HttpError(404, "this invite is invalid, used or expired");
    const now = nowIso();
    let id: number;
    if (invite.kind === "signup") {
      const username = normalizeUsername(input.username);
      if (conn.prepare("SELECT 1 FROM users WHERE username = ?").get(username)) throw new HttpError(409, "that username is taken");
      // The very first account on an installation is always the admin, whatever the invite says.
      const first = (conn.prepare("SELECT COUNT(*) c FROM users").get() as { c: number }).c === 0;
      const res = conn.prepare("INSERT INTO users (username, role, handle, password_hash, created_at) VALUES (?,?,?,?,?)")
        .run(username, first ? "admin" : invite.role, input.handle ?? newHandle(), input.passwordHash ?? null, now);
      id = Number(res.lastInsertRowid);
    } else {
      id = invite.user_id!;
      if (input.passwordHash) conn.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(input.passwordHash, id);
      conn.prepare("DELETE FROM login_sessions WHERE user_id = ?").run(id);
    }
    if (input.credential) insertCredential(id, input.credential);
    const used = conn.prepare("UPDATE invites SET used_at = ?, used_by = ? WHERE id = ? AND used_at IS NULL").run(now, id, invite.id);
    if (used.changes !== 1) throw new HttpError(409, "invite already used");
    return id;
  })();
  return getUser(userId)!;
}

// ---- Passkeys ---------------------------------------------------------------------------------

function insertCredential(userId: number, c: NewCredential) {
  db().prepare("INSERT INTO credentials (id, user_id, public_key, counter, transports, label, created_at) VALUES (?,?,?,?,?,?,?)")
    .run(c.id, userId, Buffer.from(c.publicKey), c.counter, JSON.stringify(c.transports ?? []), c.label ?? null, nowIso());
}

export function addCredential(userId: number, c: NewCredential) {
  insertCredential(userId, c);
}

export function listCredentials(userId: number) {
  return db().prepare("SELECT id, transports, label, created_at, last_used_at FROM credentials WHERE user_id = ? ORDER BY created_at").all(userId) as
    Array<{ id: string; transports: string | null; label: string | null; created_at: string; last_used_at: string | null }>;
}

export function deleteCredential(userId: number, id: string) {
  const conn = db();
  conn.transaction(() => {
    const own = conn.prepare("SELECT COUNT(*) c FROM credentials WHERE user_id = ?").get(userId) as { c: number };
    const user = conn.prepare("SELECT password_hash FROM users WHERE id = ?").get(userId) as { password_hash: string | null };
    if (own.c <= 1 && !user.password_hash) throw new HttpError(409, "this is your only way to sign in: set a password first");
    const res = conn.prepare("DELETE FROM credentials WHERE id = ? AND user_id = ?").run(id, userId);
    if (res.changes !== 1) throw new HttpError(404, "passkey not found");
  })();
}
