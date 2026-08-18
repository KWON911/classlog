import { describe, expect, it } from 'vitest'
import { searchAll } from './searchIndex'
import type { SearchAttendanceEntry, SearchRecord, Student } from '../types'

function student(overrides: Partial<Student>): Student {
  return {
    id: 'default-id',
    teacher_id: 't1',
    number: 1,
    name: '기본학생',
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
    created_at: '2026-01-01',
    ...overrides,
  }
}

const kim = student({ id: 's-kim', number: 3, name: '김민준', student_phone: '010-1234-5678' })
const lee = student({ id: 's-lee', number: 7, name: '이서연', mother_phone: '010-9999-4321' })

describe('searchAll', () => {
  it('matches a student by name substring', () => {
    const result = searchAll('민준', [kim, lee], [], [])

    expect(result.students).toEqual([{ student: kim, matches: [{ label: '이름', value: '김민준' }] }])
  })

  it('matches a phone field by suffix when the query is digits-only', () => {
    const result = searchAll('4321', [kim, lee], [], [])

    expect(result.students).toEqual([{ student: lee, matches: [{ label: '모전번', value: '010-9999-4321' }] }])
  })

  it('excludes phone fields when the query mixes letters and digits', () => {
    // "4321번" contains a non-digit character, so phone-field suffix
    // matching must not apply — only text fields (name, etc.) are checked.
    const result = searchAll('4321번', [kim, lee], [], [])

    expect(result.students).toEqual([])
  })

  it('matches a student text field by substring even for a digit-only query', () => {
    // Digit-only queries must still substring-match student TEXT fields
    // (e.g. 생년월일) via the normal text-field pass, not just the
    // phone-suffix rule. A refactor that made the digits-only branch
    // return early after checking only phone fields would break this.
    const park = student({ id: 's-park', number: 9, name: '박지훈', birthdate: '240304' })

    const result = searchAll('0304', [kim, lee, park], [], [])

    expect(result.students).toEqual([{ student: park, matches: [{ label: '생년월일', value: '240304' }] }])
  })

  it('requires at least 2 characters before matching anything', () => {
    const result = searchAll('민', [kim, lee], [], [])

    expect(result).toEqual({ students: [], records: [], attendance: [] })
  })

  it('matches record content by substring and joins the owning student', () => {
    const records: SearchRecord[] = [
      { id: 'r1', student_id: 's-kim', category: '생활지도', content: '수업 중 지각 지도함', record_date: '2026-08-01' },
    ]

    const result = searchAll('지각', [kim, lee], records, [])

    expect(result.records).toEqual([{ record: records[0], student: kim }])
  })

  it('matches attendance note by substring even for a digit-only query', () => {
    // Digit-only queries still substring-match record content and
    // attendance notes — the digits-only special case applies only to the
    // student phone-field suffix rule, not to these free-text fields.
    const attendance: SearchAttendanceEntry[] = [
      { id: 'a1', student_id: 's-kim', status: '조퇴', reason_category: '기타', note: '병원 진료 12시', date: '2026-08-20' },
    ]

    const result = searchAll('12', [kim, lee], [], attendance)

    expect(result.attendance).toEqual([{ entry: attendance[0], student: kim }])
  })

  it('excludes a record whose student no longer exists in the roster', () => {
    const records: SearchRecord[] = [
      { id: 'r1', student_id: 'deleted-student', category: '기타', content: '상담 내용', record_date: '2026-08-01' },
    ]

    const result = searchAll('상담', [kim, lee], records, [])

    expect(result.records).toEqual([])
  })

  it('caps results at 5 per group and 8 total, prioritizing students over records over attendance', () => {
    const students = Array.from({ length: 6 }, (_, i) => student({ id: `s-${i}`, number: i + 1, name: `김테스트${i}` }))
    const records: SearchRecord[] = Array.from({ length: 5 }, (_, i) => ({
      id: `r-${i}`,
      student_id: students[0].id,
      category: '기타',
      content: `김테스트 기록 ${i}`,
      record_date: '2026-08-01',
    }))

    const result = searchAll('김테스트', students, records, [])

    expect(result.students).toHaveLength(5)
    expect(result.records).toHaveLength(3)
    expect(result.attendance).toHaveLength(0)
  })

  it('shows multiple matching fields for a single student', () => {
    const gutae = student({
      id: 's-gutae',
      number: 1,
      name: '구태리',
      student_phone: '010-7679-5135',
      father_phone: '010-5297-5135',
    })

    const result = searchAll('5135', [gutae], [], [])

    // Should find both phone fields
    expect(result.students).toHaveLength(1)
    expect(result.students[0].student).toEqual(gutae)
    expect(result.students[0].matches).toContainEqual({ label: '학생전번', value: '010-7679-5135' })
    expect(result.students[0].matches).toContainEqual({ label: '부전번', value: '010-5297-5135' })
    expect(result.students[0].matches).toHaveLength(2)
  })
})
