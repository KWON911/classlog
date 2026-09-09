import { createClient } from '@supabase/supabase-js'
import { parseGoogleFormRecordImportPayload } from '../src/lib/googleFormRecordImport.js'

type ApiRequest = {
  method?: string
  headers?: Record<string, string | string[] | undefined>
  body?: unknown
}

type ApiResponse = {
  statusCode: number
  setHeader(name: string, value: string): void
  end(body?: string): void
}

type RuntimeProcess = {
  env?: Record<string, string | undefined>
}

function getEnvironmentVariable(name: string): string | undefined {
  const runtime = globalThis as typeof globalThis & { process?: RuntimeProcess }
  return runtime.process?.env?.[name]
}

function sendJson(res: ApiResponse, statusCode: number, body: Record<string, unknown>) {
  res.statusCode = statusCode
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
}

function getAuthorizationHeader(headers: ApiRequest['headers']) {
  const value = headers?.authorization ?? headers?.Authorization
  return Array.isArray(value) ? value[0] : value
}

function parseRequestBody(body: unknown) {
  if (typeof body !== 'string') return body
  try {
    return JSON.parse(body)
  } catch {
    throw new Error('JSON 본문이 올바르지 않습니다.')
  }
}

/** Google Apps Script 전용: 설문 응답을 학생별 생활기록으로 가져온다. */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST')
    sendJson(res, 405, { error: 'POST 요청만 허용됩니다.' })
    return
  }

  const secret = getEnvironmentVariable('GOOGLE_FORM_RECORD_IMPORT_SECRET')
  const teacherId = getEnvironmentVariable('GOOGLE_FORM_RECORD_IMPORT_TEACHER_ID')
  const supabaseUrl = getEnvironmentVariable('VITE_SUPABASE_URL')
  const serviceRoleKey = getEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY')

  if (!secret || !teacherId || !supabaseUrl || !serviceRoleKey) {
    sendJson(res, 500, { error: 'Google Form 연동 서버 설정이 완료되지 않았습니다.' })
    return
  }

  if (getAuthorizationHeader(req.headers) !== `Bearer ${secret}`) {
    sendJson(res, 401, { error: '인증에 실패했습니다.' })
    return
  }

  try {
    const payload = parseGoogleFormRecordImportPayload(parseRequestBody(req.body))
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await supabase.rpc('import_google_form_record', {
      p_teacher_id: teacherId,
      p_response_id: payload.responseId,
      p_student_names: payload.studentNames,
      p_content: payload.content,
      p_record_date: payload.recordDate,
    })

    if (error) {
      console.error('Google Form record import failed:', error)
      sendJson(res, 422, { error: '학생 기록을 가져오지 못했습니다.' })
      return
    }

    sendJson(res, 200, { result: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'
    sendJson(res, 400, { error: message })
  }
}
