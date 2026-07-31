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
