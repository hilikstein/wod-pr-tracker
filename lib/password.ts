import crypto from "node:crypto";
import { promisify } from "node:util";
import { HttpError } from "./http.ts";

const scrypt = promisify(crypto.scrypt) as (pw: string, salt: Buffer, keylen: number, opts: crypto.ScryptOptions) => Promise<Buffer>;

// scrypt, N=2^15 (OWASP's minimum profile is N=2^17 r=8 at 128 MiB; this is 32 MiB so a small server can take parallel logins).
const N = 32768;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 64 * 1024 * 1024;

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

export function validatePassword(pw: string) {
  if (pw.length < PASSWORD_MIN) throw new HttpError(400, `password must be at least ${PASSWORD_MIN} characters`);
  if (pw.length > PASSWORD_MAX) throw new HttpError(400, `password must be at most ${PASSWORD_MAX} characters`);
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pw, salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !salt || !hash) throw new Error("unrecognised password hash format");
  const expected = Buffer.from(hash, "base64");
  const key = await scrypt(pw, Buffer.from(salt, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: MAXMEM });
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

let dummy: Promise<string> | undefined;
/** Burns the same time as a real check, so an unknown username is not distinguishable by response time. */
export async function spendVerifyTime(pw: string) {
  dummy ??= hashPassword("not-a-real-password");
  await verifyPassword(pw, await dummy);
}
