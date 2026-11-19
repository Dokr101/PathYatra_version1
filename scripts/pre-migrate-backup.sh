#!/usr/bin/env bash
# Snapshot the SQLite database before `prisma migrate dev` touches it.
#
#   bash scripts/pre-migrate-backup.sh
#   DB_PATH=/srv/app.db BACKUP_DIR=/var/backups/pathyatra bash scripts/pre-migrate-backup.sh
#
# Writes backend/prisma/backups/pre-<epoch>.db through the same consistent
# online-backup path as `npm run db:backup` (node:sqlite VACUUM INTO, or the
# sqlite3 CLI on older Node). The default `prisma:migrate` script runs this
# first, so a failed or destructive migration always leaves a restorable file.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

BACKUP_DIR="${BACKUP_DIR:-backend/prisma/backups}" \
BACKUP_PREFIX="${BACKUP_PREFIX:-pre}" \
BACKUP_STAMP="${BACKUP_STAMP:-epoch}" \
DB_PATH="${DB_PATH:-backend/prisma/dev.db}" \
exec node scripts/backup-db.mjs
