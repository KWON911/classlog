import type { IncomingMessage, ServerResponse } from 'node:http'
import { isAllowedEndpoint, proxyToNeis } from './_lib/neisProxy.ts'

/**
 * Vercel serverless function: browser -> here -> NEIS.
 * NEIS_API_KEY is a server-only env var (set in the Vercel project's
 * Settings -> Environment Variables) — it is never sent to the client.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '', 'http://localhost')
  const endpoint = url.searchParams.get('endpoint') ?? ''

  if (!isAllowedEndpoint(endpoint)) {
    res.statusCode = 400
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: '허용되지 않은 endpoint입니다.' }))
    return
  }

  const apiKey = process.env.NEIS_API_KEY
  if (!apiKey) {
    res.statusCode = 500
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'NEIS_API_KEY가 서버에 설정되어 있지 않습니다.' }))
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
}
