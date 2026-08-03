import { isAllowedEndpoint, proxyToNeis } from './_lib/neisProxy'

type ApiRequest = {
  url?: string
}

type ApiResponse = {
  statusCode: number
  setHeader(name: string, value: string): void
  end(body?: string): void
}

type RuntimeProcess = {
  env?: Record<string, string | undefined>
}

function getServerEnvironmentVariable(name: string): string | undefined {
  const runtime = globalThis as typeof globalThis & {
    process?: RuntimeProcess
  }

  return runtime.process?.env?.[name]
}

/**
 * Vercel serverless function: browser -> here -> NEIS.
 *
 * NEIS_API_KEY는 Vercel 서버 환경변수로만 사용하며
 * 브라우저에는 전달하지 않습니다.
 */
export default async function handler(
  req: ApiRequest,
  res: ApiResponse,
) {
  const url = new URL(req.url ?? '', 'http://localhost')
  const endpoint = url.searchParams.get('endpoint') ?? ''

  if (!isAllowedEndpoint(endpoint)) {
    res.statusCode = 400
    res.setHeader('content-type', 'application/json')
    res.end(
      JSON.stringify({
        error: '허용되지 않은 endpoint입니다.',
      }),
    )
    return
  }

  const apiKey = getServerEnvironmentVariable('NEIS_API_KEY')

  if (!apiKey) {
    res.statusCode = 500
    res.setHeader('content-type', 'application/json')
    res.end(
      JSON.stringify({
        error: 'NEIS_API_KEY가 서버에 설정되어 있지 않습니다.',
      }),
    )
    return
  }

  try {
    const { status, body } = await proxyToNeis(
      endpoint,
      url.searchParams,
      apiKey,
    )

    res.statusCode = status
    res.setHeader('content-type', 'application/json')
    res.end(body)
  } catch (error) {
    console.error('NEIS proxy request failed:', error)

    res.statusCode = 502
    res.setHeader('content-type', 'application/json')
    res.end(
      JSON.stringify({
        error: 'NEIS API 요청에 실패했습니다.',
      }),
    )
  }
}
