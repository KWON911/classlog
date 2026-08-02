/**
 * Shared NEIS proxy logic used by both the Vercel serverless function
 * (api/neis.ts, production) and the Vite dev middleware (vite.config.ts,
 * `npm run dev`) so the two entry points never drift apart.
 *
 * The NEIS API key must never reach the browser bundle — callers pass it
 * in from a server-only env var (NEIS_API_KEY, not VITE_-prefixed).
 */

const ALLOWED_ENDPOINTS = new Set(['schoolInfo', 'elsTimetable', 'mealServiceDietInfo', 'SchoolSchedule'])

const NEIS_BASE_URL = 'https://open.neis.go.kr/hub'

export function isAllowedEndpoint(endpoint: string): boolean {
  return ALLOWED_ENDPOINTS.has(endpoint)
}

export async function proxyToNeis(endpoint: string, searchParams: URLSearchParams, apiKey: string) {
  const url = new URL(`${NEIS_BASE_URL}/${endpoint}`)
  url.searchParams.set('KEY', apiKey)
  url.searchParams.set('Type', 'json')
  for (const [key, value] of searchParams) {
    if (key === 'endpoint') continue
    url.searchParams.set(key, value)
  }

  const response = await fetch(url)
  const body = await response.text()
  return { status: response.status, body }
}
