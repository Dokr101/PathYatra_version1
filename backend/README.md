# PathYatra backend

Express + Prisma API for the PathYatra React app. Local development uses SQLite;
the data model mirrors the Laravel/MySQL schema.

## Local setup

From the repository root:

```bash
npm install                 # root: Vite, React, concurrently
cd backend
npm install                 # API dependencies
npx prisma migrate dev      # creates prisma/dev.db and applies migrations
npx prisma db seed          # 4 categories + 18 destinations
cd ..
npm run dev                 # Vite on :3000 and the API on :3001
```

The root `dev` script runs both processes with `concurrently`. Vite proxies
`/api`, `/images` and `/logo.png` to `http://localhost:3001`, so the frontend can
use same-origin URLs during development and CORS never comes into play.

Useful backend scripts:

| Script | Purpose |
| --- | --- |
| `npm run dev` | nodemon + tsx, restarts on changes |
| `npm run build` | compile TypeScript to `dist/` |
| `npm start` | run the compiled server |
| `npm run prisma:migrate` | create/apply a migration |
| `npm run prisma:studio` | open Prisma Studio |
| `npm run prisma:seed` | re-run the idempotent seed |

## Environment

`backend/.env` (git-ignored; see `.env.example`) contains:

```dotenv
DATABASE_URL="file:./dev.db"
JWT_SECRET="<at least 32 random characters>"
PORT=3001
```

SQLite is resolved relative to `prisma/schema.prisma`, so the database file is
`backend/prisma/dev.db`.

To move to Postgres later, change `provider` in `prisma/schema.prisma`, update
`DATABASE_URL`, then run `npx prisma migrate dev`. No application code depends on
the provider.

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
| POST | `/api/auth/register` | — | `{ fullName, email, password }` → `{ token, user }` |
| POST | `/api/auth/login` | — | `{ email, password }` → `{ token, user }` |
| GET | `/api/auth/me` | Bearer | current user (no password hash) |

Send the JWT as `Authorization: Bearer <token>`; it expires after 7 days.

### Destinations (public)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/destinations` | all destinations with category, `averageRating`, `reviewCount` |
| GET | `/api/destinations/:slug` | one destination |
| GET | `/api/destinations/:slug/reviews` | public reviews + rating summary |

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
| POST | `/api/reviews` | `{ destinationId, rating 1–5, comment?, travelDate? }` |
| GET | `/api/favorites` | own favorites with destination |
| POST | `/api/favorites/:destinationId` | idempotent add |
| DELETE | `/api/favorites/:destinationId` | idempotent remove |

`GET /api/health` returns `{ "ok": true }`.
