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
# 1. Install frontend dependencies
npm install

# 2. Setup and seed backend database
cd backend
npm install
npx prisma migrate dev
npx prisma db seed          # seeds 4 categories + 18 destinations
npm run seed:admin          # bootstraps admin credentials from backend/.env

# 3. Start development servers
cd ..
npm run dev
```

The root `npm run dev` script uses `concurrently` to run both the Vite frontend and the Express backend simultaneously:
- **Frontend**: `http://localhost:5173` (proxies `/api`, `/images`, and `/logo.png` to the backend)
- **Backend API**: `http://localhost:3001`

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
│   ├── .gitignore               # Ignores .env, node_modules, dist, SQLite db
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
├── .gitignore                   # Root gitignore rules
├── index.html                   # HTML document template
├── package.json                 # Frontend dependencies and concurrent dev runner
├── tsconfig.json                # TypeScript compiler configuration
├── vite.config.ts               # Vite configuration and proxy rules
└── README.md                    # Project documentation
```

---

## Security & Release Checklist

### Secret Management
- `backend/.env` is strictly gitignored. Real secrets must never be committed to source control or bundled into release zip archives.
- If secrets are ever compromised or exposed in an archive:
  1. Generate a new `JWT_SECRET` with `openssl rand -hex 32`.
  2. Change `ADMIN_SEED_PASSWORD` in `backend/.env`.
  3. Re-run `npm run seed:admin` inside `backend/` to update the admin hash.

### Release & Distribution Checklist
Before packaging or distributing archives of this project:
- [ ] **Check untracked/ignored files**: Run `git status --ignored` to verify no `.env`, `.env.local`, or `*.db` files are included.
- [ ] **Never zip raw working trees**: Always use `git archive` to package clean releases:
  ```bash
  git archive --format=zip --output=pathyatra-release.zip HEAD
  ```
- [ ] **Verify lockfiles**: Ensure `backend/package-lock.json` is preserved and that no rogue lockfiles (`bun.lock`, `yarn.lock`, `pnpm-lock.yaml`) exist.
- [ ] **Verify builds**: Run `npm run build` at root and `npm run build` in `backend/` to verify type safety and bundle generation.

