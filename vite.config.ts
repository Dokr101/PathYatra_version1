import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    proxy: {
      // Express API and its static uploads — keeps dev same-origin, no CORS.
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/images': { target: 'http://localhost:3001', changeOrigin: true },
      '/logo.png': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
})
