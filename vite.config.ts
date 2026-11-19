import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * The production CSP lives in index.html. The dev server needs two looser
 * directives: @vitejs/plugin-react injects an inline react-refresh preamble
 * (blocked by script-src 'self') and HMR opens a websocket to the dev origin.
 * This plugin swaps the meta content in `vite dev` only; `vite build` keeps the
 * strict tag untouched.
 */
const DEV_CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://res.cloudinary.com",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' ws: https://api.open-meteo.com https://*.ingest.sentry.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ')

function devCsp(): Plugin {
  return {
    name: 'pathyatra-dev-csp',
    apply: 'serve',
    transformIndexHtml(html) {
      return html.replace(
        /(<meta\s+http-equiv="Content-Security-Policy"\s+content=")[^"]*(")/,
        `$1${DEV_CSP}$2`,
      )
    },
  }
}

export default defineConfig(({ mode }) => {
  /**
   * Loopback by default. The dev server hands out unminified source, HMR and
   * stack traces, and Vite's dev middleware is not hardened for hostile
   * networks, so LAN exposure has to be an explicit opt-in:
   *   VITE_HOST=0.0.0.0 npm run dev:web
   */
  const host = loadEnv(mode, '.', 'VITE_').VITE_HOST || 'localhost'

  return {
    plugins: [react(), tailwindcss(), devCsp()],
    server: {
      host,
      port: 3000,
      strictPort: true,
      proxy: {
        // Express API and its static uploads — keeps dev same-origin, no CORS.
        '/api': { target: 'http://localhost:3001', changeOrigin: true },
        '/images': { target: 'http://localhost:3001', changeOrigin: true },
        '/logo.png': { target: 'http://localhost:3001', changeOrigin: true },
      },
    },
    preview: {
      port: 4173,
      strictPort: true,
      // Same-origin proxying so the built bundle can be exercised against the
      // real API with the production CSP tag in place.
      proxy: {
        '/api': { target: 'http://localhost:3001', changeOrigin: true },
        '/images': { target: 'http://localhost:3001', changeOrigin: true },
        '/logo.png': { target: 'http://localhost:3001', changeOrigin: true },
      },
    },
  }
})
