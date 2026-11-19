# PathYatra backend

Express + Prisma API for the PathYatra React app. Local development uses SQLite;
the data model mirrors the Laravel/MySQL schema.

## Local setup

From the repository root:

```bash
npm ci                      # root: Vite, React, concurrently (locked versions)
cd backend
npm ci                      # API dependencies (locked versions)
npx prisma migrate dev      # creates prisma/dev.db and applies migrations
npx prisma db seed          # 4 categories + 18 destinations
cd ..
npm run dev                 # Vite on :3000 and the API on :3001
```

Install with `npm ci`, never `npm install`: the lockfiles are committed and CI
verifies they do not change. `.npmrc` (root and backend) sets `save-exact=true`
and `engine-strict=true`, so any dependency change is pinned and committed with
its lockfile.

The root `dev` script runs both processes with `concurrently`. Vite proxies
`/api`, `/images` and `/logo.png` to `http://localhost:3001`, so the frontend can
use same-origin URLs during development and CORS never comes into play.

Useful backend scripts:

| Script | Purpose |
| --- | --- |
| `npm run dev` | nodemon + tsx, restarts on changes |
| `npm run build` | clean, then compile TypeScript to `dist/` via `tsconfig.build.json` (no `.map` files) |
| `npm test` | run the node:test suites (`auth.login`, `jwt` + middleware) |
| `npm start` | run the compiled server |
| `npm run prisma:migrate` | snapshot `dev.db`, then create/apply a migration (`prisma migrate dev`) |
| `npm run prisma:studio` | open Prisma Studio |
| `npm run prisma:seed` | re-run the idempotent seed |

### Database backups

SQLite keeps the whole dataset in one file (`prisma/dev.db` by default), so a
disk failure, an accidental `npx prisma migrate reset`, or a bad migration takes
all user data with it. Several migrations are destructive (`DROP TABLE`, column
rebuilds), so take a snapshot **before** applying migrations and on a schedule.

From the repository root:

```bash
npm run db:backup
# Backed up backend/prisma/dev.db -> backups/pathyatra-20261118-125001.db (0.42 MB, node:sqlite, integrity ok)
```

Or call the script directly and override the paths:

```bash
node scripts/backup-db.mjs
DB_PATH=/srv/pathyatra/app.db BACKUP_DIR=/var/backups/pathyatra node scripts/backup-db.mjs
```

- Output is `pathyatra-YYYYMMDD-HHMMSS.db` in `backups/` (gitignored via `*.db`).
- The copy is made with SQLite's online-backup API (`VACUUM INTO` through
  `node:sqlite`, or the `sqlite3` CLI's `.backup` command on Node < 22.5), so a
  running API keeps serving and you never capture a half-written WAL.
- Every backup is verified with `PRAGMA integrity_check`; the script exits
  non-zero and leaves the file for inspection if the check fails.

Restore by stopping the API, keeping the damaged file, and putting the snapshot
back in place:

```bash
mv backend/prisma/dev.db backend/prisma/dev.db.broken
cp backups/pathyatra-20261118-125001.db backend/prisma/dev.db
npm run dev   # or: npm run build && npm start
```

Automate it with cron (daily at 02:15, keeping 14 days):

```cron
15 2 * * * cd /srv/pathyatra && npm run db:backup && find /srv/pathyatra/backups -name 'pathyatra-*.db' -mtime +14 -delete
```

For anything beyond a laptop, move the snapshot off the machine: `rsync`/`rclone`
the directory to object storage, or run [Litestream](https://litestream.io/),
which streams SQLite's WAL continuously to S3-compatible storage and restores to
a point in time. Litestream is the recommended option if SQLite is ever promoted
to staging or production; run it as the sidecar/process that owns the database
file and keep this script as the pre-migration snapshot.

If you migrate to Postgres instead (see below), replace this with scheduled
`pg_dump` snapshots, for example
`pg_dump "$DATABASE_URL" -Fc -f /var/backups/pathyatra-$(date +%F).dump`; those
are not handled by this script.

### Migrations and pre-migration snapshots

Every migration must follow the same rule: **snapshot first, migrate second.**
Some migrations rebuild tables — `20261109051111_admin_panel` runs
`CREATE TABLE new_X; INSERT … SELECT …; DROP TABLE X; ALTER TABLE new_X RENAME`
for `Category`, `Destination`, `Itinerary`, `Review` and `User`, and there is no
`down` migration to undo it. On SQLite a failure part-way through such a rebuild
leaves the schema between two shapes, so restoring the snapshot is the only
rollback path. (Postgres runs DDL transactionally and should be the production
target once you outgrow SQLite.)

`npm run prisma:migrate` enforces this for local work: it runs
`scripts/pre-migrate-backup.sh`, which writes `backend/prisma/backups/pre-<epoch>.db`
with the same verified online-backup path as `npm run db:backup`, and only then
calls `prisma migrate dev`. If the backup fails, the migration does not run.

```bash
cd backend
npm run prisma:migrate        # snapshot, then prisma migrate dev
```

Applied migrations are history: never edit an applied `migration.sql`, because
Prisma stores its checksum in `_prisma_migrations` and every existing database
would then report a modified migration. Record intent in a new comment-only
migration instead (for example `20261119150000_default_currency_note`).

#### Retired fields

`SiteSetting.defaultCurrency` was added with `DEFAULT 'NPR'` and later dropped.
Nothing read it — `npr()` in `src/lib/format.ts` formats every price as NPR — so
no backfill was required and the value was simply discarded. Currency is not
configurable today: a `currency` column needs a new migration, an admin field
and a reader in the pricing path before it means anything.

For a deployed database the snapshot is still your job before applying existing
migrations:

```bash
BACKUP_DIR=/var/backups/pathyatra bash scripts/pre-migrate-backup.sh
cd backend && npx prisma migrate deploy
```

Keep the snapshot until the new build has served traffic for a while; if the
migration fails, stop the API and copy it back (see the restore steps above).
Do not run `prisma migrate reset` against any database you cannot rebuild.

### Running in production (pm2)

`ecosystem.config.cjs` defines one app, `pathyatra-api`, in cluster mode with a
512 MB heap cap, `max_memory_restart: 512M`, and restart back-off so a crash loop
does not hammer the port.

```bash
npm run build
npx pm2 start ecosystem.config.cjs --env production
npx pm2 logs pathyatra-api
npx pm2 reload pathyatra-api            # zero-downtime restart of every worker
npx pm2 install pm2-logrotate           # rotate ~/.pm2/logs
npx pm2 save && npx pm2 startup systemd # start on boot
```

Two per-process facts decide the worker count. The config defaults to **one**
worker while `DATABASE_URL` is a SQLite `file:` URL — SQLite accepts a single
writer — and the rate limiters keep their counters in memory, so `10` attempts
per 15 minutes becomes `10 × workers` when traffic is spread across them. After
moving to Postgres, start with `PM2_INSTANCES=max`; exact per-IP limits still
need a shared store for the limiter.

With Docker (see the root README) use the image's own supervision instead: `CMD`
runs the server under `--max-old-space-size=512` and the compose restart policy
or orchestrator brings a failed container back. Do not run pm2 inside it.

### Error monitoring (Sentry)

`SENTRY_DSN` is optional and off by default. When it is set,
`src/lib/observability.ts` initialises `@sentry/node` — imported before Express so
the integration can wrap it — and every unhandled `500` from the error handler is
reported with the environment (`NODE_ENV`), the release when `SENTRY_RELEASE` is
set, and 10% of requests traced. Only the method and path are attached: cookies,
authorization headers and bodies never leave the process (`sendDefaultPii: false`).
Without a DSN no client is created, nothing is sent, and the handler logs to pino
as before.

```bash
SENTRY_DSN="https://<key>@o<org>.ingest.sentry.io/<project>"
SENTRY_RELEASE="pathyatra@<commit>"   # optional, ties errors to a deploy
```

The browser uses the same project through `VITE_SENTRY_DSN`, which Vite inlines
at build time — pass `--build-arg VITE_SENTRY_DSN=…` when building the Docker
image, or put it in the shell before `npm run build`.

## Environment

`backend/.env` (git-ignored; see `.env.example`) contains:

```dotenv
DATABASE_URL="file:./dev.db"
JWT_SECRET="<at least 32 random characters>"
PORT=3001
```

SQLite is resolved relative to `prisma/schema.prisma`, so the database file is
`backend/prisma/dev.db`.

### Behind a reverse proxy

`TRUST_PROXY_HOPS` tells Express how many proxies sit in front of the API and is
applied with `app.set('trust proxy', n)` before the rate limiters are mounted.

| Value | Meaning |
| --- | --- |
| `0` (default) | The API is reached directly — local dev, or a bare Node process on a public IP |
| `1` | One layer, e.g. nginx or an AWS ALB terminating TLS |
| `2` | Two layers, e.g. Cloudflare/CloudFront in front of nginx or an ALB |

With the wrong value the IP-based controls fail quietly: too low and every request
looks like it came from the proxy, so one client's traffic rate-limits the whole
site (and `req.protocol` reads as HTTP despite TLS upstream); too high and
express-rate-limit trusts an `X-Forwarded-For` value a client can choose, which
is a limiter bypass. Set the real hop count, and make sure the API port is not
reachable except through the proxy — otherwise a direct connection can spoof the
header itself.

To move to Postgres later, change `provider` in `prisma/schema.prisma`, update
`DATABASE_URL`, then run `npx prisma migrate dev`. No application code depends on
the provider.

### Money columns

Every cost and budget field (`Destination.costPerPersonPerDay`, `Activity.costEstimate`,
`ItineraryTemplate.estimatedCost`, `Itinerary.totalBudget`, `ItineraryStop.estimatedCost`,
`TemplateStop.estimatedCost`) is Prisma `Decimal`, not `Float`, and the zod schemas round
to two decimals and reject non-finite input. SQLite has no exact numeric type, so locally
those columns are still REAL; Postgres stores them as `DECIMAL(65,30)`. For a stricter
production column, add `@db.Decimal(12, 2)` to the six fields after switching the provider
(native type attributes are not available with the SQLite connector).

Prisma hands back `Decimal` objects, which JSON-encode as strings, so `src/server.ts`
sets an Express `json replacer` that converts them to numbers. The API response shape is
unchanged: clients still receive numbers.

### Password hashing

Passwords are hashed with bcrypt at cost **12**, the floor in OWASP's Password
Storage Cheat Sheet; the old cost 10 made a stolen dump four times cheaper to
crack. `BCRYPT_ROUNDS` overrides it and `src/lib/password.ts` is the only place
the cost is read: registration, both password-change handlers and `seed:admin`
all call `hashPassword()` from there. An out-of-range value fails the request
instead of being silently ignored.

Raising the cost does not rewrite stored hashes. Each one is upgraded on the next
successful sign-in: after `bcrypt.compare` succeeds, a hash made at an older cost
is re-hashed at the current one. That is best-effort — a failed upgrade is logged
and the sign-in still succeeds. The login decoy hash used for unknown emails is
generated at boot at the same cost, so timing stays indistinguishable whichever
cost is configured.

The tests pin `BCRYPT_ROUNDS=10` in the `test` script to keep the timing test fast;
that is a test-only setting, never a production one.

### Secrets and rotation

`.env` is git-ignored and must never be committed, zipped into a release, or
handed over with the source tree. Anything in it — especially `JWT_SECRET` and
`ADMIN_SEED_PASSWORD` — is only as private as the copy it lives in: if a copy of
this project reaches someone else, **treat both values as compromised** and
rotate them. Rotating locally does not undo a leak; it limits what the leaked
values can still do.

`.env.example` holds placeholders only, and the API refuses to start while either
secret is still one of them (`src/lib/env.ts`):

| Check | Result |
| --- | --- |
| `JWT_SECRET` missing or shorter than 32 characters | boot fails |
| `JWT_SECRET` equals the value in `.env.example` | boot fails |
| `ADMIN_SEED_PASSWORD` set but equals the `.env.example` value | boot fails |
| `ADMIN_SEED_PASSWORD` set but shorter than 12 characters | boot fails |

#### Rotate the JWT signing secret

```bash
cd backend
openssl rand -hex 32          # copy the output
# put it in .env as JWT_SECRET="<value>"
```

Restart the API (`npm run dev` restarts on source changes; otherwise restart the
process). **Every issued token stops working immediately**, because signatures no
longer verify — users, including admins, have to sign in again. That is the
intended effect after a leak. Tokens live 24 hours, so without rotation a leaked
secret would keep working for a day plus the lifetime of anything you reissue.

If you cannot rotate the signing key right away, you can end every session by
bumping the per-user session version instead — the same mechanism used after a
password change:

```sql
UPDATE "User" SET "tokenVersion" = "tokenVersion" + 1;
```

#### Rotate the bootstrap admin password

```bash
cd backend
openssl rand -base64 24       # copy the output
# put it in .env as ADMIN_SEED_PASSWORD="<value>"
npm run seed:admin           # upserts the admin and re-hashes the password
```

`seed:admin` is idempotent: it updates the existing account's password hash and
keeps the account's id, so existing itineraries and audit entries are untouched.
After seeding, remove `ADMIN_SEED_PASSWORD` from `.env` — the API does not need it
— and use the in-app password change (Admin → Settings) from then on.

#### If a secret has leaked

1. Rotate `JWT_SECRET` and the admin password as above, on the affected
deployment.
2. Review Admin → Audit logs for sign-ins, role changes and deletions made by
accounts you do not recognise.
3. Disable or delete any admin account that should not exist (`isActive: false`
blocks sign-in).
4. Check where the copy went — release archive, screenshot, chat — and remove it.
5. Only then restore service; the boot check above keeps placeholder values from
slipping back in.

## Assets

Destination photos live in `backend/public/images/destinations/` and are served at
`/images/destinations/<slug>.jpg`. Each seeded `Destination.imagePath` matches its
slug, so cards can render `destination.imagePath` directly. The PathYatra logo is
served at `/logo.png`.

## API

All request bodies are validated with zod. Validation failures return `400`:

```json
{ "error": "Validation failed", "fields": { "email": "Enter a valid email address" } }
```

### Auth

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | — | `{ fullName, email, password }` → `{ user }` + session cookie |
| POST | `/api/auth/login` | — | `{ email, password }` → `{ user }` + session cookie |
| GET | `/api/auth/me` | Cookie | current user (no password hash) |
| POST | `/api/auth/refresh` | Cookie | re-issues the session cookie → `{ ok: true }` |
| POST | `/api/auth/logout` | Cookie | bumps `tokenVersion`, clears the cookie → `204` |
| POST | `/api/auth/password/change` | Cookie | `{ currentPassword, newPassword, confirmPassword }` → `{ ok: true }` + new cookie |

The JWT is delivered in an **HttpOnly cookie** (`pathyatra_session`,
`SameSite=Strict`, `Path=/`, 24-hour `Max-Age`, plus `Secure` when
`NODE_ENV=production`). It never appears in a response body, so browser
JavaScript cannot read it. `Authorization: Bearer <token>` is still accepted for
scripts and API clients; the web app does not use it.

Cookie-authenticated requests are CSRF-guarded: any `POST`/`PATCH`/`PUT`/`DELETE`
carrying an `Origin` header must match `ALLOWED_ORIGINS`, otherwise it gets `403`.
Requests without an `Origin` (curl, server-to-server tests) pass through.

Both write endpoints bump `tokenVersion`, so any token minted earlier returns
`401` on the next request — signing out on one device signs out every device.
`password/change` and `/refresh` re-issue the cookie for the caller so the device
that made the change stays signed in. Admins change their own password through
`/api/admin/settings/password`, which behaves the same way.

`POST /api/auth/register` answers `409` when the email is already registered. That
is a deliberate product decision — sign-up logs the user in immediately and this
build sends no email — so the endpoint carries two limits instead: 5 attempts per
hour per IP and 5 per hour per email address (stored as a SHA-256 hash of the
normalized address, never the raw value). Registration also hashes the password
before the uniqueness lookup, so a duplicate address does not answer measurably
faster than a new one. Removing the enumeration channel entirely would require a
generic `201` plus email verification before the first sign-in.

`PATCH /api/admin/users/:id/status` bumps `tokenVersion` as well, on disable **and**
on enable. While an account is off, the middleware rejects its tokens anyway; the
bump is what stops a token minted before the disable from silently working again
the moment the account is re-enabled. Anyone whose account state changes signs in
again.

### Destinations (public)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/destinations` | one page of published destinations → `{ items, total, page, pageSize, totalPages }` |
| GET | `/api/destinations/featured` | up to 6 most-saved destinations, for the homepage |
| GET | `/api/destinations/:slug` | one destination |
| GET | `/api/destinations/:slug/reviews` | public reviews + rating summary |

`GET /api/destinations` accepts `page` (default 1), `pageSize` (default 20,
capped at 100), `q` (matches name, province or district), `categoryId` and
`province`. Registration order matters: `/featured` is declared before `/:slug`
so it is not captured as a slug. The list is capped so one unauthenticated
request cannot pull the whole catalogue and all of its relations; the web app
pages through 100 at a time.

### Itineraries (auth, scoped to the token's user)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/itineraries` | own trips, with days and stops |
| POST | `/api/itineraries` | `destinationId` or `destinationSlug` plus trip fields |
| GET | `/api/itineraries/:id` | 404 if owned by someone else |
| PATCH / PUT | `/api/itineraries/:id` | partial update; sending `days` replaces day/stop tree |
| DELETE | `/api/itineraries/:id` | cascades days and stops |

Create/update accepts nested days:

```json
{
  "destinationSlug": "pokhara",
  "title": "Pokhara long weekend",
  "startDate": "2026-12-01",
  "numTravelers": 2,
  "totalBudget": 30000,
  "days": [
    {
      "dayNumber": 1,
      "dayDate": "2026-12-01",
      "stops": [{ "timeSlot": "Morning", "title": "Phewa boating", "estimatedCost": 500 }]
    }
  ]
}
```

### Reviews and favorites (auth for writes)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/reviews` | `{ destinationId, rating 1–5, comment?, travelDate? }`; `409` if the caller already reviewed that destination |
| PATCH | `/api/reviews/:id` | own review, `PENDING` only: `{ rating?, comment?, travelDate? }`; `409` once moderated |
| DELETE | `/api/reviews/:id` | own review, any status → `204`; `404` when it is not yours |
| GET | `/api/favorites` | own favorites with destination |
| POST | `/api/favorites/:destinationId` | idempotent add |
| DELETE | `/api/favorites/:destinationId` | idempotent remove |

One review per traveller per destination is enforced by
`@@unique([userId, destinationId])` on `Review`, not only by the route's check,
so a script that skips the API still cannot flood the moderation queue. The
`review_uniqueness` migration deletes existing duplicates (keeping an approved
review first, then the newest) before it creates the index. A second review of
the same destination returns:

```json
{ "error": "You have already reviewed this destination", "fields": { "destinationId": "You have already reviewed this destination" } }
```

A different traveller can review the same destination, and a hidden review keeps
its row — the unique key is the (user, destination) pair, not the destination.

Travellers can edit or delete their own review. `PATCH` refuses (`409`) once the
review is `APPROVED` or `HIDDEN`, so a rating cannot be rewritten after
moderation; edits after that go through `/api/admin/reviews/:id/moderate`.
`DELETE` works at any status and is the erasure path for a comment that
accidentally contains personal details — public averages and counts drop the row
immediately. Both routes filter by `userId` in the query itself and answer `404`
for someone else's review id, so the API never reveals whether it exists.

`GET /api/health` returns `{ "ok": true }`.
