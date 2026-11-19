#!/usr/bin/env node
// Consistent, timestamped snapshot of the SQLite database.
//
//   node scripts/backup-db.mjs                 # backend/prisma/dev.db -> backups/
//   DB_PATH=... BACKUP_DIR=/var/backups/pathyatra node scripts/backup-db.mjs
//   BACKUP_PREFIX=pre BACKUP_STAMP=epoch node scripts/backup-db.mjs
//
// A plain file copy of a live SQLite database can capture a torn WAL state, so
// this uses SQLite's own online-backup mechanism: `VACUUM INTO` through the
// node:sqlite module (Node >= 22.5), falling back to the `sqlite3` CLI's
// `.backup` command. Both take a read snapshot, so the API can keep serving.

import { existsSync, mkdirSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(repoRoot, process.env.DB_PATH ?? 'backend/prisma/dev.db')
const destDir = resolve(repoRoot, process.env.BACKUP_DIR ?? 'backups')

if (!existsSync(source)) {
  console.error(`No database at ${source}. Nothing to back up.`)
  process.exit(1)
}

mkdirSync(destDir, { recursive: true })

// BACKUP_STAMP=epoch gives `pre-1795000000.db`, helpful when the filename has to
// sort chronologically in a plain `ls`.
function timestamp() {
  if (process.env.BACKUP_STAMP === 'epoch') return String(Math.floor(Date.now() / 1000))
  return new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, '')
    .replace('T', '-')
}

const prefix = (process.env.BACKUP_PREFIX ?? 'pathyatra').replace(/[^A-Za-z0-9._-]/g, '-') || 'pathyatra'

let target = resolve(destDir, `${prefix}-${timestamp()}.db`)
for (let n = 2; existsSync(target); n += 1) {
  target = resolve(destDir, `${prefix}-${timestamp()}-${n}.db`)
}

const sqlPath = target.replace(/'/g, "''")

async function backupWithNodeSqlite() {
  const { DatabaseSync } = await import('node:sqlite')
  const db = new DatabaseSync(source)
  try {
    db.exec(`VACUUM INTO '${sqlPath}'`)
  } finally {
    db.close()
  }
  const check = new DatabaseSync(target, { readOnly: true })
  try {
    const [row] = check.prepare('PRAGMA integrity_check').all()
    return Object.values(row ?? {})[0]
  } finally {
    check.close()
  }
}

function backupWithSqliteCli() {
  const copy = spawnSync('sqlite3', [source, `.backup '${sqlPath}'`], { encoding: 'utf8' })
  if (copy.error?.code === 'ENOENT') {
    throw new Error('node:sqlite is unavailable (needs Node >= 22.5) and the sqlite3 CLI is not installed')
  }
  if (copy.status !== 0) {
    throw new Error(`sqlite3 .backup failed: ${copy.stderr.trim() || `exit ${copy.status}`}`)
  }
  const check = spawnSync('sqlite3', [target, 'PRAGMA integrity_check;'], { encoding: 'utf8' })
  if (check.status !== 0) {
    throw new Error(`sqlite3 integrity check failed: ${check.stderr.trim() || `exit ${check.status}`}`)
  }
  return check.stdout.trim()
}

let mode = 'node:sqlite'
let integrity
try {
  integrity = await backupWithNodeSqlite()
} catch (error) {
  if (
    !error?.code?.startsWith?.('ERR_UNKNOWN_BUILTIN_MODULE') &&
    !/node:sqlite|No such built-in module|Cannot find module/.test(String(error?.message))
  ) {
    throw error
  }
  mode = 'sqlite3 .backup'
  integrity = backupWithSqliteCli()
}

if (integrity !== 'ok') {
  console.error(`Backup at ${target} failed its integrity check: ${integrity}`)
  process.exit(1)
}

const sizeMb = (statSync(target).size / 1024 / 1024).toFixed(2)
const display = (path) => {
  const rel = relative(repoRoot, path)
  return rel.startsWith('..') ? path : rel
}
console.log(`Backed up ${display(source)} -> ${display(target)} (${sizeMb} MB, ${mode}, integrity ok)`)
