import { describe, expect, it } from 'vitest'
import { decodeCsvBytes, parseStudentsCsv } from './csv'

function csvRow(fields: string[]): string {
  return fields.join(',')
}

describe('decodeCsvBytes', () => {
  it('decodes valid UTF-8 bytes as-is', () => {
    const original = csvRow(['출석번호', '이름', '성별']) + '\n' + csvRow(['1', '김민준', '남'])
    const bytes = new TextEncoder().encode(original).buffer

    expect(decodeCsvBytes(bytes)).toBe(original)
  })

  it('falls back to EUC-KR decoding when bytes are not valid UTF-8', () => {
    // 0xb1 0xe6 is the CP949/EUC-KR encoding of '길'; 0xb1 is not a valid
    // UTF-8 continuation byte in that position, so the strict UTF-8 decode
    // is guaranteed to throw and the function must fall back.
    const bytes = new Uint8Array([0xb1, 0xe6]).buffer

    expect(decodeCsvBytes(bytes)).toBe('길')
  })
})

describe('parseStudentsCsv', () => {
  it('parses valid rows with all fields', () => {
    const csv = [
      csvRow(['1', '김민준', '남', '010-1111-2222', '010-3333-4444']),
      csvRow(['2', '이서연', '여', '', '010-5555-6666']),
    ].join('\n')

    const { valid, skipped } = parseStudentsCsv(csv, new Set())

    expect(valid).toEqual([
      { number: 1, name: '김민준', gender: '남', student_phone: '010-1111-2222', parent_phone: '010-3333-4444' },
      { number: 2, name: '이서연', gender: '여', student_phone: null, parent_phone: '010-5555-6666' },
    ])
    expect(skipped).toEqual([])
  })

  it('skips a header row when the first column is not numeric', () => {
    const csv = [
      csvRow(['출석번호', '이름', '성별', '본인연락처', '학부모연락처']),
      csvRow(['1', '김민준', '', '', '']),
    ].join('\n')

    const { valid } = parseStudentsCsv(csv, new Set())

    expect(valid).toEqual([
      { number: 1, name: '김민준', gender: null, student_phone: null, parent_phone: null },
    ])
  })

  it('reports the stripped header row in skipped rather than discarding it silently', () => {
    const header = ['출석번호', '이름', '성별', '본인연락처', '학부모연락처']
    const csv = [csvRow(header), csvRow(['1', '김민준', '', '', ''])].join('\n')

    const { skipped } = parseStudentsCsv(csv, new Set())

    expect(skipped).toEqual([{ raw: header, reason: '헤더로 판단해 제외' }])
  })

  it('does not treat the first row as a header when its first column is numeric', () => {
    const csv = [csvRow(['1', '김민준', '', '', '']), csvRow(['2', '이서연', '', '', ''])].join('\n')

    const { valid } = parseStudentsCsv(csv, new Set())

    expect(valid).toHaveLength(2)
  })

  it('skips a row with no name', () => {
    const row = ['1', '', '', '', '']
    const csv = csvRow(row)

    const { valid, skipped } = parseStudentsCsv(csv, new Set())

    expect(valid).toEqual([])
    expect(skipped).toEqual([{ raw: row, reason: '이름 없음' }])
  })

  it('skips a row whose 출석번호 is not a number', () => {
    const row = ['abc', '김민준', '', '', '']
    const csv = csvRow(row)

    const { valid, skipped } = parseStudentsCsv(csv, new Set())

    expect(valid).toEqual([])
    expect(skipped).toEqual([{ raw: row, reason: '출석번호가 숫자가 아님' }])
  })

  it('skips a row whose 출석번호 already exists in the roster', () => {
    const row = ['1', '김민준', '', '', '']
    const csv = csvRow(row)

    const { valid, skipped } = parseStudentsCsv(csv, new Set([1]))

    expect(valid).toEqual([])
    expect(skipped).toEqual([{ raw: row, reason: '이미 명부에 있는 출석번호' }])
  })

  it('keeps the first occurrence and skips later duplicates within the file', () => {
    const firstRow = ['1', '김민준', '', '', '']
    const secondRow = ['1', '이서연', '', '', '']
    const csv = [csvRow(firstRow), csvRow(secondRow)].join('\n')

    const { valid, skipped } = parseStudentsCsv(csv, new Set())

    expect(valid).toEqual([
      { number: 1, name: '김민준', gender: null, student_phone: null, parent_phone: null },
    ])
    expect(skipped).toEqual([{ raw: secondRow, reason: 'CSV 내 중복된 출석번호' }])
  })
})
