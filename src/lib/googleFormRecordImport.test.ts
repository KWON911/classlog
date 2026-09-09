import { describe, expect, it } from 'vitest'
import { parseGoogleFormRecordImportPayload } from './googleFormRecordImport'

const validPayload = {
  responseId: 'response-123',
  studentNames: [' 김민서 ', '이도윤'],
  content: '수업에 적극적으로 참여함. ',
  recordDate: '2026-09-09',
}

describe('parseGoogleFormRecordImportPayload', () => {
  it('normalizes the form response before import', () => {
    expect(parseGoogleFormRecordImportPayload(validPayload)).toEqual({
      responseId: 'response-123',
      studentNames: ['김민서', '이도윤'],
      content: '수업에 적극적으로 참여함.',
      recordDate: '2026-09-09',
    })
  })

  it.each([
    [{ ...validPayload, responseId: '' }, '응답 ID'],
    [{ ...validPayload, studentNames: [] }, '학생 이름'],
    [{ ...validPayload, studentNames: ['김민서', '김민서'] }, '중복된 학생 이름'],
    [{ ...validPayload, content: '   ' }, '교사기록'],
    [{ ...validPayload, recordDate: '2026/09/09' }, '기록 날짜'],
  ])('rejects invalid payloads: %s', (payload, message) => {
    expect(() => parseGoogleFormRecordImportPayload(payload)).toThrow(message)
  })
})
