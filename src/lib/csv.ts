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
  student_phone: string | null
  parent_phone: string | null
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
    const [numberRaw, name, gender, studentPhone, parentPhone] = raw

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
      student_phone: studentPhone || null,
      parent_phone: parentPhone || null,
    })
  }

  return { valid, skipped }
}
