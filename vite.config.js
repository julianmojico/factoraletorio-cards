import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const venv = loadEnv(mode, process.cwd(), '')
  const env = Object.keys(venv)
    .filter((k) => k.startsWith('VITE_'))
    .reduce((cur, k) => ({ ...cur, [k]: venv[k] }), {})

  return {
    plugins: [
      react(),
      {
        name: 'html-transform',
        transformIndexHtml(html) {
          return html.replace(/%(.*?)%/g, (_, p1) => env[p1] ?? '')
        },
      },
    ],
    server: { watch: { usePolling: false } },
  }
})
