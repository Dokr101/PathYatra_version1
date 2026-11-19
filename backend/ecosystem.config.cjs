/**
 * pm2 process definition for the compiled API.
 *
 *   npm run build
 *   npx pm2 start ecosystem.config.cjs --env production
 *
 * Why the instance count is conditional: pm2 cluster mode runs one Node process
 * per core, and every process has its own memory. Two things in this API are
 * per-process rather than shared:
 *
 *   - SQLite is a single-writer file database; several workers writing at once
 *     turn into `SQLITE_BUSY` retries. One worker is the safe default while the
 *     database is `file:…`.
 *   - express-rate-limit keeps counts in memory, so a request limit of 10 per
 *     15 minutes becomes 10 × workers when requests are spread across them.
 *
 * After moving to Postgres (see README), run with `PM2_INSTANCES=max` to use
 * every core; the rate limits still need a shared store (e.g. the rate-limit
 * Redis adapter) before they are exact under cluster mode.
 */
const databaseUrl = process.env.DATABASE_URL ?? ''
const isSqlite = databaseUrl.startsWith('file:')

/** `max`, a positive integer, or the SQLite/Postgres default. */
function resolveInstances() {
  const raw = (process.env.PM2_INSTANCES ?? '').trim().toLowerCase()
  if (raw === 'max') return 'max'

  const parsed = Number(raw)
  if (Number.isInteger(parsed) && parsed > 0) return parsed

  return isSqlite ? 1 : 'max'
}

module.exports = {
  apps: [
    {
      name: 'pathyatra-api',
      script: 'dist/server.js',
      cwd: __dirname,
      instances: resolveInstances(),
      exec_mode: 'cluster',

      // A 512 MB heap cap paired with the restart threshold: the process dies of
      // a clean heap error before the kernel OOM-killer picks a random victim,
      // and pm2 brings it straight back.
      node_args: '--max-old-space-size=512',
      max_memory_restart: '512M',

      autorestart: true,
      // A crash loop should back off instead of hammering the port.
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 2000,
      exp_backoff_restart_delay: 200,
      // server.ts drains connections on SIGINT/SIGTERM; give it time to finish.
      kill_timeout: 5000,

      time: true,
      merge_logs: true,

      env: {
        NODE_ENV: 'development',
        LOG_LEVEL: 'info',
      },
      env_production: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
      },
    },
  ],
}
