// Usage: node scripts/create-invite.mjs [--admin] [--note "who it is for"] [--days 7]
// Prints a one-time invite link. The first account on a new installation becomes the admin automatically;
// after that, admins create invites from the app (the People tab). --admin makes a further admin account,
// for example to get back in when the only admin is locked out.
// Needs ORIGIN (and BASE_PATH if the app is mounted below the site root). Creates the database if it does not exist.
import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { initSchema } from "../lib/schema.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback) => {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  if (!args[i + 1] || args[i + 1].startsWith("--")) { console.error(`${name} needs a value`); process.exit(1); }
  return args[i + 1];
};

const origin = process.env.ORIGIN;
if (!origin) { console.error("ORIGIN env is not set (for example https://pb.example.com)"); process.exit(1); }
const basePath = process.env.BASE_PATH ?? "";
const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "data", "wod-pr-tracker.db");
const days = Number(value("--days", "7"));
const note = value("--note", "").trim();
if (!Number.isFinite(days) || days < 1 || days > 90) { console.error("--days must be 1-90"); process.exit(1); }
if (note.length > 120) { console.error("--note must be at most 120 characters"); process.exit(1); }

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");
initSchema(db);
const token = crypto.randomBytes(32).toString("base64url");
const now = new Date();
db.prepare("INSERT INTO invites (token_hash, kind, role, user_id, note, created_by, created_at, expires_at) VALUES (?,?,?,?,?,?,?,?)")
  .run(crypto.createHash("sha256").update(token).digest("hex"), "signup", flag("--admin") ? "admin" : "member", null, note, null, now.toISOString(), new Date(now.getTime() + days * 86400_000).toISOString());
console.log(`${origin}${basePath}/invite/${token}`);
