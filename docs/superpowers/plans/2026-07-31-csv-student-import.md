---
render_with_liquid: false
---

# CSV Student Roster Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a teacher bulk-import students into the roster from a CSV file (e.g. exported from Excel), with a preview step showing what will be added versus skipped and why.

**Architecture:** A pure parsing module (`src/lib/csv.ts`) handles encoding detection and CSV parsing/validation with no I/O or React dependencies. `useStudents` gains a bulk `addStudents` method that inserts all valid rows in a single Supabase request. A new `ImportStudentsPanel` component drives the file-pick → preview → confirm flow and is wired into `StudentListPage` next to the existing "학생 추가" button.

**Tech Stack:** React 19, TypeScript, Vitest (for `csv.ts` and the `useStudents` hook), Supabase (`@supabase/supabase-js`), Tailwind CSS. No new dependencies — CSV parsing is hand-written (fixed 5-column format, no embedded-comma risk) and encoding detection uses the browser/Node built-in `TextDecoder`.

## Global Constraints

- All UI copy is in Korean, matching the rest of the app.
- Styling uses Tailwind CSS utility classes exclusively.
- Data access goes through custom hooks only — components must not import `supabase` directly.
- CSV columns are fixed order: `출석번호,이름,성별,본인연락처,학부모연락처`. No column-mapping UI.
- No dependency additions for CSV parsing (see design doc's approach comparison — a hand-written parser was chosen over `papaparse`).
- Automated test coverage for this plan is limited to `src/lib/csv.ts` and the new `addStudents` method on `useStudents`. `ImportStudentsPanel` and its wiring into `StudentListPage` are verified via `npm run build` / `npm run lint` and manual smoke checks, matching this project's existing test-scope convention.
- Source spec: `docs/superpowers/specs/2026-07-31-csv-student-import-design.md`.

---

### Task 1: CSV parsing module (TDD)

**Files:**
- Create: `src/lib/csv.ts`
- Test: `src/lib/csv.test.ts`

**Interfaces:**
- Consumes: nothing (pure module, no imports from the rest of the app).
- Produces:
  - `decodeCsvBytes(bytes: ArrayBuffer): string` — tries strict UTF-8 decoding first, falls back to EUC-KR (CP949) decoding if the bytes aren't valid UTF-8.
  - `type ParsedStudentRow = { number: number; name: string; gender: string | null; student_phone: string | null; parent_phone: string | null }`
  - `type SkippedRow = { raw: string[]; reason: string }`
  - `parseStudentsCsv(text: string, existingNumbers: Set<number>): { valid: ParsedStudentRow[]; skipped: SkippedRow[] }`

  Used by `useStudents`'s `addStudents` caller and `ImportStudentsPanel` in Tasks 2 and 3.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/csv.test.ts`:

```ts
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
    // 0xff and 0xfe are never valid UTF-8 lead bytes, so the strict UTF-8
    // decode is guaranteed to throw and the function must fall back rather
    // than propagate the error.
    const bytes = new Uint8Array([0xff, 0xfe, 0xb1, 0xe6]).buffer

    expect(() => decodeCsvBytes(bytes)).not.toThrow()
    expect(typeof decodeCsvBytes(bytes)).toBe('string')
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- csv`
Expected: FAIL — `Failed to resolve import "./csv"` (the module doesn't exist yet).

- [ ] **Step 3: Implement the module**

Create `src/lib/csv.ts`:

```ts
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
  const dataRows = rows.length > 0 && Number.isNaN(Number(rows[0][0])) ? rows.slice(1) : rows

  const valid: ParsedStudentRow[] = []
  const skipped: SkippedRow[] = []
  const seenNumbers = new Set<number>()

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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- csv`
Expected: PASS, all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/csv.ts src/lib/csv.test.ts
git commit -m "feat: add CSV parsing module for student roster import"
```

---

### Task 2: `useStudents.addStudents` bulk insert (TDD)

**Files:**
- Modify: `src/lib/hooks/useStudents.ts`
- Modify: `src/lib/hooks/useStudents.test.ts`

**Interfaces:**
- Consumes: `NewStudent` type (already private to `useStudents.ts`); `createQueryBuilder` from `../../test/supabaseMock` (test only, already used by the existing tests in this file).
- Produces: `addStudents(rows: NewStudent[]): Promise<{ inserted?: Student[]; error?: string }>`, added to `useStudents()`'s return value alongside the existing `addStudent`/`updateStudent`/`deleteStudent`/`refetch`. `NewStudent`'s shape (`number`, `name`, `gender: string | null`, `student_phone: string | null`, `parent_phone: string | null`) is structurally identical to `ParsedStudentRow` from Task 1, so `ParsedStudentRow[]` can be passed directly where `NewStudent[]` is expected — used by `ImportStudentsPanel` in Task 3.

- [ ] **Step 1: Write the failing tests**

Add these two tests to the existing `describe('useStudents', ...)` block in `src/lib/hooks/useStudents.test.ts` (add them after the existing `'deletes a student'` test, keeping all existing tests unchanged):

```ts
  it('adds multiple students in one request and keeps the list sorted', async () => {
    const existingHigh = {
      id: '9',
      teacher_id: 't1',
      number: 9,
      name: '최지우',
      gender: null,
      student_phone: null,
      parent_phone: null,
      created_at: '2026-01-01',
    }
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [existingHigh], error: null }))
    const { result } = renderHook(() => useStudents())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetUser.mockResolvedValue({ data: { user: { id: 't1' } } })
    const inserted = [
      {
        id: '7',
        teacher_id: 't1',
        number: 1,
        name: '김민준',
        gender: null,
        student_phone: null,
        parent_phone: null,
        created_at: '2026-01-01',
      },
      {
        id: '8',
        teacher_id: 't1',
        number: 3,
        name: '박지후',
        gender: null,
        student_phone: null,
        parent_phone: null,
        created_at: '2026-01-01',
      },
    ]
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: inserted, error: null }))

    await act(async () => {
      await result.current.addStudents([
        { number: 1, name: '김민준', gender: null, student_phone: null, parent_phone: null },
        { number: 3, name: '박지후', gender: null, student_phone: null, parent_phone: null },
      ])
    })

    expect(result.current.students.map((s) => s.id)).toEqual(['7', '8', '9'])
  })

  it('surfaces the error message when the bulk insert fails', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [], error: null }))
    const { result } = renderHook(() => useStudents())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetUser.mockResolvedValue({ data: { user: { id: 't1' } } })
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: null, error: { message: '네트워크 오류' } }))

    await act(async () => {
      const outcome = await result.current.addStudents([
        { number: 1, name: '김민준', gender: null, student_phone: null, parent_phone: null },
      ])
      expect(outcome.error).toBe('네트워크 오류')
    })

    expect(result.current.students).toEqual([])
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- useStudents`
Expected: FAIL — `result.current.addStudents is not a function` (the method doesn't exist yet). The 4 pre-existing tests in this file still pass.

- [ ] **Step 3: Implement `addStudents`**

In `src/lib/hooks/useStudents.ts`, add this new function inside `useStudents`, placed after `addStudent` and before `updateStudent`:

```ts
  const addStudents = useCallback(async (rows: NewStudent[]) => {
    if (rows.length === 0) {
      return { inserted: [] }
    }

    const { data: userData } = await supabase.auth.getUser()
    const teacherId = userData.user?.id
    if (!teacherId) {
      setError('로그인이 필요합니다.')
      return { error: '로그인이 필요합니다.' }
    }

    const { data, error } = await supabase
      .from('students')
      .insert(rows.map((row) => ({ ...row, teacher_id: teacherId })))
      .select()

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setStudents((prev) => [...prev, ...(data ?? [])].sort((a, b) => a.number - b.number))
    return { inserted: data ?? [] }
  }, [])
```

Then update the hook's return statement to include it:

```ts
  return {
    students,
    loading,
    error,
    addStudent,
    addStudents,
    updateStudent,
    deleteStudent,
    refetch: fetchStudents,
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- useStudents`
Expected: PASS, all 6 tests green (4 pre-existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/hooks/useStudents.ts src/lib/hooks/useStudents.test.ts
git commit -m "feat: add bulk addStudents to useStudents hook"
```

---

### Task 3: Import panel and wiring into the student list page

**Files:**
- Create: `src/components/ImportStudentsPanel.tsx`
- Modify: `src/routes/StudentListPage.tsx`

**Interfaces:**
- Consumes: `decodeCsvBytes`, `parseStudentsCsv`, `ParsedStudentRow`, `SkippedRow` from `../lib/csv` (Task 1); `addStudents` from `useStudents()` (Task 2).
- Produces: `ImportStudentsPanel` component with props `{ existingNumbers: Set<number>, onImport: (rows: ParsedStudentRow[]) => Promise<{ error?: string }>, onCancel: () => void }`. Not consumed by any later task in this plan.

- [ ] **Step 1: Create the import panel**

Create `src/components/ImportStudentsPanel.tsx`:

```tsx
import { useState, type ChangeEvent } from 'react'
import { decodeCsvBytes, parseStudentsCsv, type ParsedStudentRow, type SkippedRow } from '../lib/csv'

type ImportStudentsPanelProps = {
  existingNumbers: Set<number>
  onImport: (rows: ParsedStudentRow[]) => Promise<{ error?: string }>
  onCancel: () => void
}

export function ImportStudentsPanel({ existingNumbers, onImport, onCancel }: ImportStudentsPanelProps) {
  const [valid, setValid] = useState<ParsedStudentRow[]>([])
  const [skipped, setSkipped] = useState<SkippedRow[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [hasFile, setHasFile] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileError(null)
    setImportError(null)

    try {
      const bytes = await file.arrayBuffer()
      const text = decodeCsvBytes(bytes)
      const result = parseStudentsCsv(text, existingNumbers)

      if (result.valid.length === 0 && result.skipped.length === 0) {
        setFileError('파일에서 읽을 수 있는 내용이 없습니다.')
        setHasFile(false)
        return
      }

      setValid(result.valid)
      setSkipped(result.skipped)
      setHasFile(true)
    } catch {
      setFileError('파일을 읽을 수 없습니다.')
      setHasFile(false)
    }
  }

  const handleConfirm = async () => {
    setSubmitting(true)
    const result = await onImport(valid)
    setSubmitting(false)
    if (result.error) {
      setImportError(result.error)
      return
    }
    onCancel()
  }

  return (
    <div className="flex flex-col gap-3">
      <input type="file" accept=".csv" onChange={handleFileChange} />

      {fileError && <p className="text-sm text-red-600">{fileError}</p>}

      {hasFile && (
        <>
          <p className="text-sm">
            추가될 학생 {valid.length}명 · 건너뛴 항목 {skipped.length}건
          </p>

          {valid.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {valid.map((row) => (
                <li key={row.number}>
                  {row.number}. {row.name}
                </li>
              ))}
            </ul>
          )}

          {skipped.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm text-gray-500">
              {skipped.map((row, index) => (
                <li key={index}>
                  {row.raw.join(', ')} — {row.reason}
                </li>
              ))}
            </ul>
          )}

          {importError && <p className="text-sm text-red-600">{importError}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={submitting || valid.length === 0}
              className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
            >
              가져오기
            </button>
            <button type="button" onClick={onCancel} className="rounded border border-gray-300 px-3 py-2">
              취소
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire the panel into the student list page**

Replace the full contents of `src/routes/StudentListPage.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { useStudents } from '../lib/hooks/useStudents'
import { useAuth } from '../lib/hooks/useAuth'
import { StudentForm, type StudentFormValues } from '../components/StudentForm'
import { StudentListItem } from '../components/StudentListItem'
import { ImportStudentsPanel } from '../components/ImportStudentsPanel'

export function StudentListPage() {
  const { students, loading, error, addStudent, addStudents } = useStudents()
  const { signOut } = useAuth()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const filtered = useMemo(
    () => students.filter((s) => s.name.includes(search.trim())),
    [students, search],
  )

  const existingNumbers = useMemo(() => new Set(students.map((s) => s.number)), [students])

  const handleAdd = async (values: StudentFormValues) => {
    const result = await addStudent({
      number: values.number,
      name: values.name,
      gender: values.gender || null,
      student_phone: values.student_phone || null,
      parent_phone: values.parent_phone || null,
    })
    if (!result.error) {
      setShowForm(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">학생 명부</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowImport(false)
              setShowForm((v) => !v)
            }}
            className="rounded bg-blue-600 px-3 py-2 text-white"
          >
            {showForm ? '닫기' : '학생 추가'}
          </button>
          <button
            onClick={() => {
              setShowForm(false)
              setShowImport((v) => !v)
            }}
            className="rounded border border-gray-300 px-3 py-2"
          >
            {showImport ? '닫기' : 'CSV 가져오기'}
          </button>
          <button
            onClick={() => signOut()}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            로그아웃
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-4 rounded border border-gray-200 p-4">
          <StudentForm submitLabel="추가" onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {showImport && (
        <div className="mb-4 rounded border border-gray-200 p-4">
          <ImportStudentsPanel
            existingNumbers={existingNumbers}
            onImport={addStudents}
            onCancel={() => setShowImport(false)}
          />
        </div>
      )}

      <input
        type="text"
        placeholder="이름 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded border border-gray-300 px-3 py-2"
      />

      {loading && <p>불러오는 중...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="flex flex-col gap-2">
        {filtered.map((student) => (
          <StudentListItem key={student.id} student={student} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: exits 0. (This is the strongest check here — it will catch any mismatch between `ImportStudentsPanel`'s `onImport` prop type and `addStudents`'s actual signature.)

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, log in, go to the student list page.
1. Prepare a small CSV file (e.g. with a text editor, save as UTF-8) with two lines: `1,김민준,남,010-1111-2222,010-3333-4444` and `2,이서연,여,,010-5555-6666`.
2. Click "CSV 가져오기", select the file — a preview shows "추가될 학생 2명 · 건너뛴 항목 0건" with both names listed.
3. Click "가져오기" — both students appear in the roster, sorted by number.
4. Re-select the same CSV file again — the preview now shows both rows in "건너뛴 항목" with reason "이미 명부에 있는 출석번호", and the "가져오기" button is disabled (0 valid rows).
5. Try a CSV with a row missing a name, e.g. `3,,,,,` — it appears under "건너뛴 항목" with reason "이름 없음".

- [ ] **Step 5: Commit**

```bash
git add src/components/ImportStudentsPanel.tsx src/routes/StudentListPage.tsx
git commit -m "feat: add CSV import panel to student list page"
```
