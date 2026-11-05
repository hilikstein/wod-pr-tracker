// Single source of truth for the database schema. Used by the app (lib/db.ts) and by the CLI scripts
// in scripts/, so the DDL exists exactly once.
export const SCHEMA_VERSION = 1;

export const SCHEMA = `
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin','member')),
  handle TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  created_at TEXT NOT NULL,
  last_login_at TEXT,
  disabled_at TEXT
);

CREATE TABLE credentials (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key BLOB NOT NULL,
  counter INTEGER NOT NULL,
  transports TEXT,
  label TEXT,
  created_at TEXT NOT NULL,
  last_used_at TEXT
);

CREATE TABLE invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('signup','recovery')),
  role TEXT NOT NULL CHECK (role IN ('admin','member')),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  note TEXT NOT NULL DEFAULT '',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  used_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  revoked_at TEXT,
  CHECK ((kind = 'recovery') = (user_id IS NOT NULL))
);

CREATE TABLE challenges (
  id TEXT PRIMARY KEY,
  challenge TEXT NOT NULL,
  purpose TEXT NOT NULL,
  data TEXT,
  expires_at TEXT NOT NULL
);

CREATE TABLE login_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE custom_movements (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  group_name TEXT NOT NULL CHECK (group_name IN ('benchmark','lift')),
  score_kind TEXT NOT NULL CHECK (score_kind IN ('time','reps','rounds_reps','weight','points')),
  better TEXT NOT NULL CHECK (better IN ('lower','higher')),
  prescription TEXT NOT NULL DEFAULT '',
  aliases TEXT NOT NULL DEFAULT '[]',
  lift_reps TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movement_id TEXT NOT NULL,
  performed_on TEXT NOT NULL,
  lift_reps INTEGER,
  score_primary REAL NOT NULL,
  score_secondary INTEGER,
  rx INTEGER NOT NULL CHECK (rx IN (0,1)),
  adaptations TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX entries_movement_idx ON entries(user_id, movement_id, lift_reps, performed_on DESC, id DESC);

CREATE TABLE favorites (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movement_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, movement_id)
);

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

/**
 * Open-time schema check. A brand-new database gets the schema; a database at the current version is used
 * as is; anything else (an older single-user database, a newer version) is refused loudly. There is no
 * silent upgrade path: an old database must be migrated explicitly before the app opens it.
 */
export function initSchema(conn) {
  conn.pragma("foreign_keys = ON");
  const version = conn.pragma("user_version", { simple: true });
  if (version === SCHEMA_VERSION) return;
  if (version !== 0) throw new Error(`database schema version ${version} is not supported (this build expects ${SCHEMA_VERSION})`);
  const existing = conn.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all();
  if (existing.length > 0) {
    throw new Error(`database has tables (${existing.map((t) => t.name).join(", ")}) but no schema version: it predates this schema and must be migrated first`);
  }
  conn.transaction(() => {
    conn.exec(SCHEMA);
    conn.pragma(`user_version = ${SCHEMA_VERSION}`);
  })();
}
