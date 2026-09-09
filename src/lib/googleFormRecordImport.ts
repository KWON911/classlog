export type GoogleFormRecordImportPayload = {
  responseId: string
  studentNames: string[]
  content: string
  recordDate: string
}

function requiredString(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label}이 필요합니다.`)
  }
  return value.trim()
}

function parseRecordDate(value: unknown) {
  const recordDate = requiredString(value, '기록 날짜')
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(recordDate)
  if (!matched) throw new Error('기록 날짜 형식이 올바르지 않습니다.')

  const [, year, month, day] = matched
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  if (
    date.getUTCFullYear() !== Number(year)
    || date.getUTCMonth() !== Number(month) - 1
    || date.getUTCDate() !== Number(day)
  ) {
    throw new Error('기록 날짜가 올바르지 않습니다.')
  }
  return recordDate
}

export function parseGoogleFormRecordImportPayload(value: unknown): GoogleFormRecordImportPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('요청 본문이 올바르지 않습니다.')
  }

  const payload = value as Record<string, unknown>
  const responseId = requiredString(payload.responseId, '응답 ID')
  if (!Array.isArray(payload.studentNames)) throw new Error('학생 이름이 필요합니다.')

  const studentNames = payload.studentNames.map((name) => requiredString(name, '학생 이름'))
  if (studentNames.length === 0) throw new Error('학생 이름이 필요합니다.')
  if (new Set(studentNames).size !== studentNames.length) throw new Error('중복된 학생 이름은 허용되지 않습니다.')

  return {
    responseId,
    studentNames,
    content: requiredString(payload.content, '교사기록'),
    recordDate: parseRecordDate(payload.recordDate),
  }
}
