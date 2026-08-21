import type { Student, StudentRecord } from './types'

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }

  fields.push(current)
  return fields.map((field) => field.trim())
}

export function decodeCsvBytes(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('euc-kr').decode(bytes)
  }
}

export type ParsedStudentRow = {
  number: number
  name: string
  gender: string | null
  birthdate: string | null
  student_phone: string | null
  address: string | null
  father_name: string | null
  father_phone: string | null
  mother_name: string | null
  mother_phone: string | null
  emergency_contact: string | null
  note: string | null
}

export type SkippedRow = {
  raw: string[]
  reason: string
}

export type ExportableStudent = {
  number: number
  name: string
  gender: string | null
  birthdate: string | null
  student_phone: string | null
  address: string | null
  father_name: string | null
  father_phone: string | null
  mother_name: string | null
  mother_phone: string | null
  emergency_contact: string | null
  note: string | null
}

const CSV_HEADER = [
  '번호',
  '성명',
  '성별',
  '생년월일',
  '학생전번',
  '주소',
  '부성명',
  '부전번',
  '모성명',
  '모전번',
  '비상연락처',
  '비고',
]

function escapeCsvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Builds a CSV string in the same 12-column shape parseStudentsCsv expects,
 *  so an exported file can be re-imported without modification. */
export function buildStudentsCsv(students: ExportableStudent[]): string {
  const rows = students.map((s) =>
    [
      String(s.number),
      s.name,
      s.gender ?? '',
      s.birthdate ?? '',
      s.student_phone ?? '',
      s.address ?? '',
      s.father_name ?? '',
      s.father_phone ?? '',
      s.mother_name ?? '',
      s.mother_phone ?? '',
      s.emergency_contact ?? '',
      s.note ?? '',
    ]
      .map(escapeCsvField)
      .join(','),
  )
  return [CSV_HEADER.join(','), ...rows].join('\r\n')
}

const RECORDS_CSV_HEADER = ['번호', '이름', '날짜', '구분', '내용']

export type RecordExportStudent = Pick<Student, 'id' | 'number' | 'name'>

/** 학년말 행동발달상황 작성 등에 참고하기 위한 전체 학생 생활기록 내보내기.
 *  학생 번호 오름차순, 같은 학생 안에서는 기록 날짜 오름차순(과거→최근)으로
 *  정렬해 한 해 동안의 흐름을 순서대로 읽을 수 있게 한다 — RecordTimeline의
 *  "최신순" 정렬과는 의도적으로 반대 방향. students 목록에 없는 student_id를
 *  가진 기록은 조용히 제외한다(정상 데이터에서는 발생하지 않지만 방어적으로). */
export function buildRecordsCsv(records: StudentRecord[], students: RecordExportStudent[]): string {
  const studentById = new Map(students.map((s) => [s.id, s]))

  const rows = records
    .flatMap((r) => {
      const student = studentById.get(r.student_id)
      return student ? [{ student, record: r }] : []
    })
    .sort((a, b) => {
      if (a.student.number !== b.student.number) return a.student.number - b.student.number
      return (
        a.record.record_date.localeCompare(b.record.record_date) ||
        a.record.created_at.localeCompare(b.record.created_at)
      )
    })
    .map(({ student, record }) =>
      [String(student.number), student.name, record.record_date, record.category, record.content]
        .map(escapeCsvField)
        .join(','),
    )

  return [RECORDS_CSV_HEADER.join(','), ...rows].join('\r\n')
}

export function parseStudentsCsv(
  text: string,
  existingNumbers: Set<number>,
): { valid: ParsedStudentRow[]; skipped: SkippedRow[] } {
  const lines = text.split(/\r\n|\r|\n/).filter((line) => line.trim() !== '')
  const rows = lines.map(parseCsvLine)

  const valid: ParsedStudentRow[] = []
  const skipped: SkippedRow[] = []
  const seenNumbers = new Set<number>()

  let dataRows = rows
  if (rows.length > 1 && Number.isNaN(Number(rows[0][0]))) {
    skipped.push({ raw: rows[0], reason: '헤더로 판단해 제외' })
    dataRows = rows.slice(1)
  }

  for (const raw of dataRows) {
    if (raw.length < 12) {
      skipped.push({ raw, reason: '열 개수가 맞지 않음 (12열 필요)' })
      continue
    }

    const [
      numberRaw,
      name,
      gender,
      birthdate,
      studentPhone,
      address,
      fatherName,
      fatherPhone,
      motherName,
      motherPhone,
      emergencyContact,
      note,
    ] = raw

    if (!name) {
      skipped.push({ raw, reason: '이름 없음' })
      continue
    }
    if (!numberRaw) {
      skipped.push({ raw, reason: '출석번호 없음' })
      continue
    }
    const number = Number(numberRaw)
    if (!Number.isFinite(number)) {
      skipped.push({ raw, reason: '출석번호가 숫자가 아님' })
      continue
    }
    if (existingNumbers.has(number)) {
      skipped.push({ raw, reason: '이미 명부에 있는 출석번호' })
      continue
    }
    if (seenNumbers.has(number)) {
      skipped.push({ raw, reason: 'CSV 내 중복된 출석번호' })
      continue
    }

    seenNumbers.add(number)
    valid.push({
      number,
      name,
      gender: gender || null,
      birthdate: birthdate || null,
      student_phone: studentPhone || null,
      address: address || null,
      father_name: fatherName || null,
      father_phone: fatherPhone || null,
      mother_name: motherName || null,
      mother_phone: motherPhone || null,
      emergency_contact: emergencyContact || null,
      note: note || null,
    })
  }

  return { valid, skipped }
}
