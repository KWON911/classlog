import type {
  AttendanceSearchResult,
  RecordSearchResult,
  SearchAttendanceEntry,
  SearchRecord,
  SearchResults,
  Student,
  StudentSearchResult,
} from '../types'

const MIN_QUERY_LENGTH = 2
const MAX_PER_GROUP = 5
const MAX_TOTAL = 8

const STUDENT_TEXT_FIELDS: { key: keyof Student; label: string }[] = [
  { key: 'name', label: '이름' },
  { key: 'gender', label: '성별' },
  { key: 'birthdate', label: '생년월일' },
  { key: 'address', label: '주소' },
  { key: 'father_name', label: '부' },
  { key: 'mother_name', label: '모' },
  { key: 'note', label: '비고' },
]

const STUDENT_PHONE_FIELDS: { key: keyof Student; label: string }[] = [
  { key: 'student_phone', label: '학생전번' },
  { key: 'father_phone', label: '부전번' },
  { key: 'mother_phone', label: '모전번' },
  { key: 'emergency_contact', label: '비상연락처' },
]

function normalize(value: string): string {
  return value.toLowerCase()
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

function matchStudent(student: Student, trimmedQuery: string, queryIsDigitsOnly: boolean): StudentSearchResult | null {
  if (queryIsDigitsOnly) {
    for (const { key, label } of STUDENT_PHONE_FIELDS) {
      const value = student[key] as string | null
      if (value && digitsOnly(value).endsWith(trimmedQuery)) {
        return { student, matchedLabel: label, matchedValue: value }
      }
    }
  }

  const lowerQuery = normalize(trimmedQuery)
  for (const { key, label } of STUDENT_TEXT_FIELDS) {
    const value = student[key] as string | null
    if (value && normalize(value).includes(lowerQuery)) {
      return { student, matchedLabel: label, matchedValue: value }
    }
  }

  return null
}

function capResults(results: SearchResults): SearchResults {
  let budget = MAX_TOTAL

  function cap<T>(items: T[]): T[] {
    const take = Math.max(0, Math.min(items.length, budget))
    budget -= take
    return items.slice(0, take)
  }

  return {
    students: cap(results.students),
    records: cap(results.records),
    attendance: cap(results.attendance),
  }
}

export function searchAll(
  query: string,
  students: Student[],
  records: SearchRecord[],
  attendance: SearchAttendanceEntry[],
): SearchResults {
  const trimmed = query.trim()

  if (trimmed.length < MIN_QUERY_LENGTH) {
    return { students: [], records: [], attendance: [] }
  }

  const queryIsDigitsOnly = /^\d+$/.test(trimmed)
  const lowerQuery = normalize(trimmed)
  const studentById = new Map(students.map((s) => [s.id, s]))

  const studentResults: StudentSearchResult[] = []
  for (const student of students) {
    if (studentResults.length >= MAX_PER_GROUP) break
    const match = matchStudent(student, trimmed, queryIsDigitsOnly)
    if (match) studentResults.push(match)
  }

  const recordResults: RecordSearchResult[] = []
  for (const record of records) {
    if (recordResults.length >= MAX_PER_GROUP) break
    if (!normalize(record.content).includes(lowerQuery)) continue
    const student = studentById.get(record.student_id)
    if (!student) continue
    recordResults.push({ record, student })
  }

  const attendanceResults: AttendanceSearchResult[] = []
  for (const entry of attendance) {
    if (attendanceResults.length >= MAX_PER_GROUP) break
    if (!entry.note || !normalize(entry.note).includes(lowerQuery)) continue
    const student = studentById.get(entry.student_id)
    if (!student) continue
    attendanceResults.push({ entry, student })
  }

  return capResults({ students: studentResults, records: recordResults, attendance: attendanceResults })
}
