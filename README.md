# WOD PR Tracker

A small, self-hosted logbook for **personal bests**: the named benchmark workouts (Fran, Murph, Cindy and
friends) and your lifts at 1, 3 and 5 reps. Phone-first, installable as a home-screen app, one SQLite
file, no external services.

- **Benchmarks and lifts** from a built-in catalogue, plus your own custom ones.
- **Full history**, not just the best: every result with its date, whether it was done as prescribed,
  what you changed (*adaptations*) and free notes. Personal bests are worked out from the history;
  as-prescribed results outrank scaled ones.
- **Multi-user.** One instance can serve friends: the admin hands out invite links, and everyone keeps
  their own private results.
- **Sign in with a password or a passkey.** Username or email as the login name; no mail server needed.
- **Your data is yours:** one-click JSON export, plain SQLite underneath.

## Quick start

```bash
git clone <this repo> && cd wod-pr-tracker
cp .env.example .env                  # set ORIGIN to the address people will use
docker compose up -d --build
docker compose exec wod-pr-tracker node scripts/create-invite.mjs --note "me"
```

The last command prints a link such as `https://pb.example.com/invite/…`. Open it, pick a username and a
password (or a passkey). **The first account on an installation is always the admin**, whatever the invite says.
From then on, the admin sees a **People** tab in the app: invite others, send recovery links, disable accounts.
Used alone, it is simply a single-user logbook; the People tab is only there when you want it.

`ORIGIN` must be exactly what is in the browser's address bar (scheme and host, no trailing slash).
Cookies and passkeys are bound to it. For anything beyond trying it out, put the app behind HTTPS
(passkeys require it, except on `localhost`).

### Reverse proxy

The container listens on port 3000 (bound to `127.0.0.1` in the compose file). With Caddy:

```
pb.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

To serve it below a path on a site you already run (say `https://example.com/pb`), build with
`BASE_PATH=/pb` and proxy `/pb*` to the container. The proxy must send `X-Forwarded-For`; the login
rate limit uses it.

## Configuration

| Setting | Where | Default | Meaning |
|---|---|---|---|
| `ORIGIN` | runtime env | required | Public address, e.g. `https://pb.example.com` |
| `RP_ID` | runtime env | host of `ORIGIN` | Passkey domain; change only to share passkeys across subdomains |
| `DB_PATH` | runtime env | `/data/wod-pr-tracker.db` in the image | SQLite file |
| `TZ` | runtime env | `UTC` | Container time zone |
| `BASE_PATH` | **build** arg | empty | Mount below a path, e.g. `/pb` |
| `APP_NAME` | **build** arg | `WOD PR Tracker` | Name in the UI and web manifest |
| `PASSKEYS` | **build** arg | `on` | `off` hides passkey sign-in |

Build arguments are baked into the image; rebuild after changing them.

## Accounts, invites, recovery

- Registration is **by invite only**. An invite is a one-time link (1, 7 or 30 days); only its hash is stored,
  so it is shown once when created.
- A user who loses their password or passkey asks the admin for a **recovery link**. Using it sets a new
  password or adds a passkey and signs the user out everywhere else.
- An admin can disable and re-enable people. Disabling ends their sessions at once. The last active admin
  cannot be disabled.
- Under **Me** every user can change their password, add or remove passkeys (the last way to sign in cannot
  be removed), and download all of their data.

There is no email-based "forgot password": that needs a mail server and an account-enumeration trade-off
this project chose not to take on. Recovery goes through the admin.

## Backups

All data is one SQLite file in the volume mounted at `/data`. A consistent online copy:

```bash
docker compose exec wod-pr-tracker node -e "
  const D=require('better-sqlite3');
  new D(process.env.DB_PATH,{readonly:true}).backup('/data/backup-'+new Date().toISOString().slice(0,10)+'.db')
    .then(()=>console.log('ok'))"
```

## Security notes

- Passwords are hashed with scrypt (N=2^15). Sessions are random 256-bit tokens, stored hashed, in `HttpOnly`,
  `SameSite=Lax` cookies (`Secure` when `ORIGIN` is https). State-changing requests must carry a matching `Origin`.
- Failed sign-ins are rate limited per address and per account name (in memory: a restart resets the counters).
- Every result, favourite and custom movement is scoped to its owner in the data layer, and covered by tests.
- Administrators can see usernames, result counts and last sign-in, but the app has no screen that shows
  another person's results. The admin of course controls the server and its database file.

## Development

```bash
npm install
printf 'ORIGIN=http://localhost:3000\n' > .env.local
npm run dev                 # http://localhost:3000
node scripts/create-invite.mjs    # needs ORIGIN in the environment; prints the first invite (that account becomes the admin)
npm test                    # unit tests (node:test)
npm run lint
```

Stack: Next.js, React, SQLite (`better-sqlite3`), WebAuthn via `@simplewebauthn`, Tailwind.
The database schema is defined once in `lib/schema.mjs`. A database without a schema version, or from a
different version, is refused at start rather than guessed at; older databases need an explicit migration.

## Licence

MIT, see `LICENSE`. Image and trademark notes are in `NOTICE.md`.
