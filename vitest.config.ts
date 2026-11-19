import { defineConfig } from 'vitest/config'

/**
 * Frontend unit tests. Node-only pricing logic still runs under jsdom so tests
 * can render React components later without a second config.
 *
 * Run with `npm test` (CI, single pass) or `npx vitest` (watch).
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // Explicit imports from 'vitest' keep `tsc --noEmit` honest about globals.
    globals: false,
  },
})
