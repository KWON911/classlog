import { describe, expect, it } from 'vitest'
import { decodeCsvBytes, parseStudentsCsv } from './csv'

function csvRow(fields: string[]): string {
  return fields.join(',')
}

const emptyStudentFields = {
  gender: null,
  birthdate: null,
  student_phone: null,
  address: null,
  father_name: null,
  father_phone: null,
  mother_name: null,
  mother_phone: null,
  emergency_contact: null,
  note: null,
}

describe('decodeCsvBytes', () => {
  it('decodes valid UTF-8 bytes as-is', () => {
    const original = csvRow(['번호', '성명', '성별']) + '\n' + csvRow(['1', '김민준', '남'])
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
      csvRow([
        '1',
        '김민준',
        '남',
        '240304',
        '010-1111-2222',
        '인천시 연수구 컨벤시아대로 1',
        '김철수',
        '010-3333-4444',
        '이영희',
        '010-5555-6666',
        '이모)010-7777-8888',
        '',
      ]),
      csvRow(['2', '이서연', '여', '', '', '', '', '', '', '', '', '']),
    ].join('\n')

    const { valid, skipped } = parseStudentsCsv(csv, new Set())

    expect(valid).toEqual([
      {
        number: 1,
        name: '김민준',
        gender: '남',
        birthdate: '240304',
        student_phone: '010-1111-2222',
        address: '인천시 연수구 컨벤시아대로 1',
        father_name: '김철수',
        father_phone: '010-3333-4444',
        mother_name: '이영희',
        mother_phone: '010-5555-6666',
        emergency_contact: '이모)010-7777-8888',
        note: null,
      },
      { number: 2, name: '이서연', ...emptyStudentFields, gender: '여' },
    ])
    expect(skipped).toEqual([])
  })

  it('skips a header row when the first column is not numeric', () => {
    const header = [
      '번호', '성명', '성별', '생년월일', '학생전번', '주소',
      '부성명', '부전번', '모성명', '모전번', '비상연락처', '비고',
    ]
    const csv = [csvRow(header), csvRow(['1', '김민준', '', '', '', '', '', '', '', '', '', ''])].join('\n')

    const { valid } = parseStudentsCsv(csv, new Set())

    expect(valid).toEqual([{ number: 1, name: '김민준', ...emptyStudentFields }])
  })

  it('reports the stripped header row in skipped rather than discarding it silently', () => {
    const header = [
      '번호', '성명', '성별', '생년월일', '학생전번', '주소',
      '부성명', '부전번', '모성명', '모전번', '비상연락처', '비고',
    ]
    const csv = [csvRow(header), csvRow(['1', '김민준', '', '', '', '', '', '', '', '', '', ''])].join('\n')

    const { skipped } = parseStudentsCsv(csv, new Set())

    expect(skipped).toEqual([{ raw: header, reason: '헤더로 판단해 제외' }])
  })

  it('does not treat the first row as a header when its first column is numeric', () => {
    const csv = [
      csvRow(['1', '김민준', '', '', '', '', '', '', '', '', '', '']),
      csvRow(['2', '이서연', '', '', '', '', '', '', '', '', '', '']),
    ].join('\n')

    const { valid } = parseStudentsCsv(csv, new Set())

    expect(valid).toHaveLength(2)
  })

  it('skips a row with no name', () => {
    const row = ['1', '', '', '', '', '', '', '', '', '', '', '']
    const csv = csvRow(row)

    const { valid, skipped } = parseStudentsCsv(csv, new Set())

    expect(valid).toEqual([])
    expect(skipped).toEqual([{ raw: row, reason: '이름 없음' }])
  })

  it('skips a row whose 출석번호 is not a number', () => {
    const row = ['abc', '김민준', '', '', '', '', '', '', '', '', '', '']
    const csv = csvRow(row)

    const { valid, skipped } = parseStudentsCsv(csv, new Set())

    expect(valid).toEqual([])
    expect(skipped).toEqual([{ raw: row, reason: '출석번호가 숫자가 아님' }])
  })

  it('skips a row whose 출석번호 already exists in the roster', () => {
    const row = ['1', '김민준', '', '', '', '', '', '', '', '', '', '']
    const csv = csvRow(row)

    const { valid, skipped } = parseStudentsCsv(csv, new Set([1]))

    expect(valid).toEqual([])
    expect(skipped).toEqual([{ raw: row, reason: '이미 명부에 있는 출석번호' }])
  })

  it('keeps the first occurrence and skips later duplicates within the file', () => {
    const firstRow = ['1', '김민준', '', '', '', '', '', '', '', '', '', '']
    const secondRow = ['1', '이서연', '', '', '', '', '', '', '', '', '', '']
    const csv = [csvRow(firstRow), csvRow(secondRow)].join('\n')

    const { valid, skipped } = parseStudentsCsv(csv, new Set())

    expect(valid).toEqual([{ number: 1, name: '김민준', ...emptyStudentFields }])
    expect(skipped).toEqual([{ raw: secondRow, reason: 'CSV 내 중복된 출석번호' }])
  })
})
