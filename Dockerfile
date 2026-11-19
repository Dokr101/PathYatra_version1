# syntax=docker/dockerfile:1

# PathYatra ships two build outputs from one repository:
#   - the Vite site (root `dist/`) that an edge server or CDN serves
#   - the Express API (backend/dist) that also serves /images and /logo.png
# The runtime image contains both, plus a Prisma client generated for the schema.

###############################################################################
# Stage 1 — the browser bundle, built from the repository root.
###############################################################################
FROM node:20-alpine AS web-builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Vite inlines VITE_* values at build time, so the frontend DSN has to be a
# build argument rather than a runtime environment variable.
ARG VITE_SENTRY_DSN=""
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
RUN npm run build

###############################################################################
# Stage 2 — API dependencies, Prisma client generated for the schema.
###############################################################################
FROM node:20-alpine AS api-deps
WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
# The client is generated from the schema, so it must be present before install
# (the client's postinstall looks for it).
COPY backend/prisma ./prisma
RUN npm ci
RUN npx prisma generate

###############################################################################
# Stage 3 — compile the API on top of those dependencies.
###############################################################################
FROM api-deps AS api-builder

COPY backend/tsconfig.json backend/tsconfig.build.json ./
COPY backend/src ./src
RUN npm run build

# The node user owns the SQLite volume mount, so a named volume inherits it.
RUN mkdir -p /data && chown node:node /data

###############################################################################
# Stage 4 — tooling image for `docker compose run --rm migrate ...`.
# Keeps dev dependencies (Prisma CLI, tsx) so migrations and seeding run offline.
###############################################################################
FROM api-builder AS api-tools

###############################################################################
# Stage 5 — production dependency tree only.
###############################################################################
FROM api-builder AS api-runtime-deps

# npm keeps `prisma` and `typescript` because they are optional peers of the
# generated client; neither is used at runtime, and the Prisma CLI plus its
# engines are the bulk of the tree, so drop them. The client's own engine lives
# in node_modules/.prisma/client and is unaffected.
RUN npm prune --omit=dev \
 && rm -rf node_modules/prisma node_modules/@prisma/engines node_modules/typescript \
           node_modules/effect node_modules/fast-check

###############################################################################
# Stage 6 — runtime: compiled API, generated client, production deps only.
###############################################################################
FROM node:20-alpine AS runtime
ENV NODE_ENV=production

# Prisma's query engine links against OpenSSL, which Alpine does not ship.
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY --from=api-runtime-deps /app/backend/node_modules ./backend/node_modules
COPY --from=api-builder /app/backend/dist ./backend/dist
COPY --from=api-builder /app/backend/package.json ./backend/package.json
# Schema and migrations, so `prisma migrate deploy` can run against a fresh volume.
COPY --from=api-builder /app/backend/prisma ./backend/prisma
# Destination photography and the logo that express.static serves.
COPY backend/public ./backend/public
# The site build; an edge server or CDN serves this, the API does not.
COPY --from=web-builder /app/dist ./dist

RUN mkdir -p /data && chown node:node /data

ENV PORT=3001
EXPOSE 3001

# Nothing in this image needs root: no local uploads (media goes to Cloudinary)
# and the only writable location is the mounted /data volume.
USER node

# The memory cap matches max_memory_restart in backend/ecosystem.config.cjs: a
# heap-limit error is clean and quick, and the orchestrator (compose restart
# policy or k8s) brings the container back.
CMD ["node", "--max-old-space-size=512", "backend/dist/server.js"]
