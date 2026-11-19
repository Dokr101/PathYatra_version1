# PathYatra (पथयात्रा)

> **Your Journey. Your Budget. Your Nepal.**  
> A Nepal-first travel companion designed for discovering destinations across all seven provinces, planning multi-day itineraries with season and altitude awareness, and managing travel budgets with honest local estimates.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Lucide React, Leaflet
- **Backend**: Express 5, Prisma ORM, SQLite (local development), TypeScript, bcrypt, jsonwebtoken, zod
- **Package Manager**: `npm` (standardized across root and backend)

---

## Quick Start / How to Run

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v20+ recommended)
- `npm` (v10+ recommended)

### 2. Setup and Run

Clone the repository and run the following sequence:

```bash
# 1. Install frontend dependencies (exactly as locked)
npm ci

# 2. Setup and seed backend database
cd backend
npm ci
npx prisma migrate dev
npx prisma db seed          # seeds 4 categories + 18 destinations
npm run seed:admin          # bootstraps admin credentials from backend/.env

# 3. Start development servers
cd ..
npm run dev
```

> **Install with `npm ci`, never `npm install`.** Both lockfiles are committed and
> CI fails if either changes after a clean `npm ci`. `.npmrc` sets
> `save-exact=true` and `engine-strict=true`, so a dependency added with
> `npm install <package>` is pinned exactly and must be committed together with
> the updated `package-lock.json`. Node 20.19+ is required.

The root `npm run dev` script uses `concurrently` to run both the Vite frontend and the Express backend simultaneously:
- **Frontend**: `http://localhost:3000` (proxies `/api`, `/images`, and `/logo.png` to the backend)
- **Backend API**: `http://localhost:3001`

The Vite dev server binds to loopback (`localhost:3000`) by default, so other
machines on the network cannot reach it. To open it from a phone or another
computer on the same LAN, opt in explicitly:

```bash
VITE_HOST=0.0.0.0 npm run dev:web
```

Only do that on a network you trust — the dev server serves unminified source,
HMR websockets and stack traces, and its middleware is not hardened for hostile
networks.

---

## Repository Folder Layout

```
pathyatra/
├── backend/                     # Express 5 + Prisma API server
│   ├── prisma/                  # Prisma schema, migrations, and seeders
│   │   ├── schema.prisma        # Database schema definitions
│   │   ├── seed.ts              # Seeder (4 categories + 18 destinations)
│   │   └── seed-admin.ts        # Admin user bootstrap script
│   ├── public/                  # Backend static assets (/images, /logo.png)
│   │   └── images/destinations/ # Destination photography
│   ├── src/                     # Backend TypeScript source code
│   │   ├── middleware/          # Auth, error handling, validation, rate limiting
│   │   ├── routes/              # Express API route modules
│   │   └── server.ts            # Application bootstrap & route registration
│   ├── .env                     # Local secrets (gitignored; never commit!)
│   ├── .env.example             # Template for local environment variables
│   ├── .gitignore               # Ignores node_modules, dist, .env, prisma/dev.db
│   ├── package.json             # Backend dependencies and scripts
│   └── README.md                # Backend API documentation
├── dist/                        # Frontend production build output (local, gitignored)
├── public/                      # Static assets for frontend
├── src/                         # React frontend source code
│   ├── assets/                  # Frontend images and logos
│   │   └── destinations/        # High-resolution destination assets
│   ├── components/              # Reusable UI, layout, and admin components
│   ├── context/                 # Application React context (auth, wishlist, etc.)
│   ├── data/                    # Destination data fallbacks and taxonomy
│   ├── lib/                     # API client, calculations, and utility helpers
│   ├── pages/                   # Application views (Home, Explore, Plan, Budget, Admin)
│   ├── App.tsx                  # Root application routes and layouts
│   ├── index.css                # Global stylesheet and Tailwind v4 themes
│   └── main.tsx                 # React DOM mount entry point
├── .gitignore                   # Root ignores: node_modules, dist, env files, *.db, logs
├── index.html                   # HTML document template
├── package.json                 # Frontend dependencies and concurrent dev runner
├── tsconfig.json                # TypeScript compiler configuration
├── vite.config.ts               # Vite configuration and proxy rules
└── README.md                    # Project documentation
```

---

## Security & Release Checklist

### Secret Management
- Two ignore files protect the working tree: the root `.gitignore` (dependencies, `dist/` and `backend/dist/`, `.env` and `backend/.env` except the examples, `*.db`, logs, coverage) and `backend/.gitignore` for backend-local runtime files. Confirm what is actually ignored with `git status --ignored` before release.
- `backend/.env` is strictly gitignored. Real secrets must never be committed to source control or bundled into release zip archives.
- If secrets are ever compromised or exposed in an archive:
  1. Generate a new `JWT_SECRET` with `openssl rand -hex 32`.
  2. Change `ADMIN_SEED_PASSWORD` in `backend/.env`.
  3. Re-run `npm run seed:admin` inside `backend/` to update the admin hash.

### Sessions & Tokens
- Sign-in returns a JWT valid for **24 hours**, signed with `JWT_SECRET`. It carries the user's `tokenVersion`, and `requireAuth` rejects any token whose version no longer matches the account — so changing a password signs out every other device immediately.
- The token is stored in an **HttpOnly, `SameSite=Strict` cookie** named `pathyatra_session` (plus `Secure` when `NODE_ENV=production`). JavaScript never sees it: `document.cookie` and the Cookie Store API both hide it, so an XSS can act as the user while the page is open but cannot read or exfiltrate the session. `localStorage` holds only the non-secret profile cache.
- The web client authenticates with `credentials: 'include'` and no `Authorization` header. `/api/auth/refresh` re-issues the cookie for an authenticated caller; `/api/auth/logout` bumps `tokenVersion` and clears it.
- CSRF: `SameSite=Strict` plus an Origin allowlist on every state-changing request (`src/lib/csrf.ts`), so a form posted from another site is rejected even if the browser sends the cookie.
- Scripts and API clients can still send `Authorization: Bearer <token>`; the web app never does.

### Request Hardening
- CORS is an allowlist driven by `ALLOWED_ORIGINS` (default `http://localhost:3000`); requests without an `Origin` header are allowed for server-to-server and static use.
- `helmet` sets a restrictive CSP (`script-src 'self'`, `img-src 'self' data: https:`, `connect-src 'self' https://api.open-meteo.com`) plus the usual security headers.
- Rate limits: 300 requests / 15 min per IP for all of `/api`, 10 sign-ins / 15 min, and 5 registrations / hour.
- Proxy hops: `TRUST_PROXY_HOPS` (default `0`) is applied via `app.set('trust proxy', n)` before the limiters mount, so `req.ip` is the real client behind nginx/ALB (use `1` for one layer) and `req.protocol` follows `X-Forwarded-Proto`. The API must not be reachable except through that proxy, or the header can be spoofed.
- Every request is logged with `pino` as a single JSON line: request id, method, path, status and duration. Send an `x-request-id` header to keep your own correlation id.

### Docker

The root `Dockerfile` is a multi-stage build: the Vite site is built at the repo
root, the API is compiled with a Prisma client generated for the schema, and the
runtime image contains the compiled API, the production dependency tree,
`backend/prisma` (schema + migrations), `backend/public` (photos, logo) and the
site bundle under `/app/dist`.

```bash
docker build -t pathyatra .
docker run -d --name pathyatra --restart unless-stopped -p 3001:3001 \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  -e ADMIN_SEED_EMAIL=admin@example.com \
  -e ADMIN_SEED_PASSWORD="<12+ characters>" \
  -e ALLOWED_ORIGINS=https://your-site.example \
  -e DATABASE_URL=file:/data/pathyatra.db \
  -v pathyatra-data:/data \
  pathyatra
```

The process runs as the unprivileged `node` user and writes only to the mounted
`/data` volume. `.dockerignore` keeps `node_modules`, build output, `.env*` files
and local SQLite databases out of the image. Sentry is optional: pass
`SENTRY_DSN` (a runtime variable) and `--build-arg VITE_SENTRY_DSN=…` (inlined
into the site bundle) to report API and browser errors; both are off when unset.
`CMD` starts the server with
`--max-old-space-size=512`, and the compose `restart: unless-stopped` policy (or
Kubernetes, if you run it there) is what restarts a crashed process. Without
Docker, `backend/ecosystem.config.cjs` does the same job under pm2 — see the
backend README.

`docker compose --env-file backend/.env up --build` starts a one-shot `migrate`
container that applies migrations to the shared volume, then the API. Seed the
demo catalogue or a bootstrap admin once:

```bash
docker compose run --rm migrate npx tsx prisma/seed.ts
docker compose run --rm migrate npx tsx prisma/seed-admin.ts
```

Two things to know about a container deployment:

- The API serves `/api`, `/images` and `/logo.png`, not the SPA. Serve `/app/dist`
  from nginx or a CDN and proxy those paths to port 3001, with `ALLOWED_ORIGINS`
  set to the site's public origin and `TRUST_PROXY_HOPS` set to the real number of
  proxies in front (see the backend README).
- With `NODE_ENV=production` the session cookie is `Secure`, so terminate TLS at
  the proxy; over plain HTTP a browser will not send the cookie back and sign-in
  will appear to fail.

### Release & Distribution Checklist
Before packaging or distributing archives of this project:
- [ ] **Check untracked/ignored files**: Run `git status --ignored` to verify no `.env`, `.env.local`, or `*.db` files are included.
- [ ] **Never zip raw working trees**: Always use `git archive` to package clean releases:
  ```bash
  git archive --format=zip --output=pathyatra-release.zip HEAD
  ```
- [ ] **Verify lockfiles**: Ensure `backend/package-lock.json` is preserved and that no rogue lockfiles (`bun.lock`, `yarn.lock`, `pnpm-lock.yaml`) exist.
- [ ] **Verify builds**: Run `npm run build` at root and `npm run build` in `backend/` to verify type safety and bundle generation.

