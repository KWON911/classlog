import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { isAllowedEndpoint, proxyToNeis } from './api/_lib/neisProxy.ts'

/**
 * Mirrors api/neis.ts (the Vercel serverless function used in production)
 * so `npm run dev` can reach NEIS locally without a separate `vercel dev`
 * process. NEIS_API_KEY is read from `.env` via loadEnv with an empty
 * prefix — this runs in Vite's Node config context, so the key is never
 * bundled into client code (unlike a VITE_-prefixed variable would be).
 */
function neisDevProxy(apiKey: string | undefined): Plugin {
  return {
    name: 'neis-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/neis', async (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const endpoint = url.searchParams.get('endpoint') ?? ''

        if (!isAllowedEndpoint(endpoint)) {
          res.statusCode = 400
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: '허용되지 않은 endpoint입니다.' }))
          return
        }
        if (!apiKey) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'NEIS_API_KEY가 .env에 설정되어 있지 않습니다.' }))
          return
        }

        try {
          const { status, body } = await proxyToNeis(endpoint, url.searchParams, apiKey)
          res.statusCode = status
          res.setHeader('content-type', 'application/json')
          res.end(body)
        } catch {
          res.statusCode = 502
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'NEIS API 요청에 실패했습니다.' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), neisDevProxy(env.NEIS_API_KEY)],
  }
})
