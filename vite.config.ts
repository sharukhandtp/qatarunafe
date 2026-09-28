import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // In development the API is reached through this proxy, so the browser only ever talks to
  // the Vite origin and no CORS configuration is needed on the backend.
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:5137'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true, secure: false },
        '/health': { target: apiTarget, changeOrigin: true, secure: false },
      },
    },
  }
})
