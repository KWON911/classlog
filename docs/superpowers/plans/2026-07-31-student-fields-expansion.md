# Student Fields Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the student roster's fields from the current 5 (번호/이름/성별/본인연락처/학부모연락처) to the 12 columns used by the school's official roster template (번호/성명/성별/생년월일/학생전번/주소/부성명/부전번/모성명/모전번/비상연락처/비고), across the database schema, the app UI, and CSV import.

**Architecture:** No new architectural patterns — this widens the existing `Student` record shape and threads it through every layer that already handles it (hook, forms, list/detail views, CSV parser). Because TypeScript ties all these files together through the shared `Student`/`NewStudent`/`ParsedStudentRow` types, the whole project will not compile until both tasks in this plan have landed — Task 1 (data model + CSV parsing) is independently testable via its own unit tests, but Task 2 (UI wiring) is what makes `npm run build` pass again. This mirrors how the CSV-import feature's own Task 1 was verified (`npm test -- csv` only, no full build) before its later tasks wired it into the UI.

**Tech Stack:** React 19, TypeScript, Supabase (Postgres + RLS), Vitest. No new dependencies.

## Global Constraints

- Only 출석번호(`number`) and 성명(`name`) are required; the other 10 fields are optional (`string | null`), matching the existing validation rule (already enforced in `StudentForm`/`csv.ts`, unchanged by this plan).
- No guardian normalization — 부/모 name and phone are flat columns on `students`, not a separate table (the template is always exactly one father + one mother, so a join table would be pure overhead).
- 생년월일(`birthdate`) is stored as free text in the source format (e.g. `240304`), not converted to a date type.
- The current Supabase data is test-only and may be dropped; this plan does not include a data-migration script — the database is re-created from the updated `supabase/schema.sql`.
- CSV column order matches the template exactly: 번호,성명,성별,생년월일,학생전번,주소,부성명,부전번,모성명,모전번,비상연락처,비고.
- Automated tests remain scoped to `src/lib/csv.ts` only for this plan — the UI files touched in Task 2 (`StudentForm.tsx`, `StudentListItem.tsx`, `StudentDetailPage.tsx`, `StudentListPage.tsx`, `ImportStudentsPanel.tsx`) are verified via `npm run build` / `npm run lint` and manual smoke testing, matching this project's existing convention.
- Source spec: `docs/superpowers/specs/2026-07-31-student-fields-expansion-design.md`.

---

### Task 1: Expand the data model and CSV parsing to 12 fields

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/csv.ts`
- Modify: `src/lib/csv.test.ts`

**Interfaces:**
- Consumes: nothing (this task only redefines shared types and the standalone CSV module).
- Produces:
  - `Student` type (in `src/lib/types.ts`) with fields `id, teacher_id, number, name, gender, birthdate, student_phone, address, father_name, father_phone, mother_name, mother_phone, emergency_contact, note, created_at` — all the new fields are `string | null`. `NewStudent`/`StudentUpdate` in `useStudents.ts` are derived from `Student` via `Omit`/`Partial` and need no code changes, but their required-field shape changes because `Student` changed — every call site constructing a `NewStudent` object literal (in Task 2) must supply all 12 data fields.
  - `ParsedStudentRow` (in `src/lib/csv.ts`) with the same 12 data fields (`number`, `name`, plus the 10 optional `string | null` fields), structurally identical to `NewStudent` so `ImportStudentsPanel`'s `onImport={addStudents}` (unchanged in Task 2) continues to type-check with no wrapper function.
  - `parseStudentsCsv(text, existingNumbers)` parses the same 12-column order, with unchanged validation/dedup rules (only name/number required; duplicate and header-detection behavior identical to before, just at 12 columns instead of 5).

  Used by `useStudents.ts` (no changes needed there — it's fully generic over `Student`'s shape) and by `ImportStudentsPanel.tsx`/`StudentForm.tsx`/`StudentListItem.tsx`/`StudentDetailPage.tsx`/`StudentListPage.tsx` in Task 2.

- [ ] **Step 1: Update the database schema**

Replace the full contents of `supabase/schema.sql`:

```sql
create extension if not exists pgcrypto;

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) default auth.uid(),
  number integer not null,
  name text not null,
  gender text,
  birthdate text,
  student_phone text,
  address text,
  father_name text,
  father_phone text,
  mother_name text,
  mother_phone text,
  emergency_contact text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) default auth.uid(),
  category text not null check (category in ('생활지도', '학습', '진로', '학부모상담', '기타')),
  content text not null,
  record_date date not null,
  created_at timestamptz not null default now()
);

alter table students enable row level security;
alter table records enable row level security;

create policy "teachers manage own students" on students
  for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy "teachers manage own records" on records
  for all
  using (teacher_id = auth.uid())
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from students s
      where s.id = student_id
        and s.teacher_id = auth.uid()
    )
  );
```

This step also has a manual, human-only follow-up (not something you can do): the existing `students`/`records` tables in the live Supabase project must be dropped and recreated from this file, since `create table if not exists` is a no-op against tables that already exist with the old columns. Note this in your report but do not attempt it — you have no access to the live database.

- [ ] **Step 2: Update the `Student` type**

Replace the full contents of `src/lib/types.ts`:

```ts
export type Student = {
  id: string
  teacher_id: string
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
  created_at: string
}

export type RecordCategory = '생활지도' | '학습' | '진로' | '학부모상담' | '기타'

export type StudentRecord = {
  id: string
  student_id: string
  teacher_id: string
  category: RecordCategory
  content: string
  record_date: string
  created_at: string
}
```

- [ ] **Step 3: Write the failing CSV tests**

Replace the full contents of `src/lib/csv.test.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm test -- csv`
Expected: FAIL — the `parseStudentsCsv`/`decodeCsvBytes` assertions mismatch the old 5-field implementation (e.g. `valid` objects are missing `birthdate`/`address`/etc., or the row-length-12 test fixtures don't match the old 5-column parsing).

- [ ] **Step 5: Update the CSV parsing module**

Replace the full contents of `src/lib/csv.ts`:

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
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -- csv`
Expected: PASS, all 10 tests green.

- [ ] **Step 7: Commit**

```bash
git add supabase/schema.sql src/lib/types.ts src/lib/csv.ts src/lib/csv.test.ts
git commit -m "feat: expand student data model and CSV parsing to 12 fields"
```

---

### Task 2: Wire the expanded fields into the student UI and CSV import panel

**Files:**
- Modify: `src/components/StudentForm.tsx`
- Modify: `src/components/StudentListItem.tsx`
- Modify: `src/routes/StudentDetailPage.tsx`
- Modify: `src/routes/StudentListPage.tsx`
- Modify: `src/components/ImportStudentsPanel.tsx`
- Modify: `sample-students.csv` (repo root)
- Modify: `public/sample-students.csv`

**Interfaces:**
- Consumes: `Student` type and `addStudent`/`addStudents`/`updateStudent` from `useStudents()` (Task 1's type change, hook itself unchanged); `ParsedStudentRow` from `src/lib/csv.ts` (Task 1).
- Produces: `StudentFormValues` (in `StudentForm.tsx`) widened to the 12 fields (all `string`, matching the existing pattern where form inputs are plain strings and `|| null` coercion happens at the call site). Not consumed by any later task in this plan — this is the final task.

This task has no automated tests of its own (per Global Constraints); it is verified by `npm run build` succeeding for the whole project (the first point since Task 1 landed where the full build is expected to pass), `npm run lint`, `npm test` (confirming Task 1's tests still pass), and a manual smoke test.

- [ ] **Step 1: Expand the student form**

Replace the full contents of `src/components/StudentForm.tsx`:

```tsx
import { useState, type FormEvent } from 'react'

export type StudentFormValues = {
  number: number
  name: string
  gender: string
  birthdate: string
  student_phone: string
  address: string
  father_name: string
  father_phone: string
  mother_name: string
  mother_phone: string
  emergency_contact: string
  note: string
}

type StudentFormProps = {
  initialValues?: Partial<StudentFormValues>
  onSubmit: (values: StudentFormValues) => Promise<void> | void
  onCancel: () => void
  submitLabel: string
}

export function StudentForm({ initialValues, onSubmit, onCancel, submitLabel }: StudentFormProps) {
  const [number, setNumber] = useState(String(initialValues?.number ?? ''))
  const [name, setName] = useState(initialValues?.name ?? '')
  const [gender, setGender] = useState(initialValues?.gender ?? '')
  const [birthdate, setBirthdate] = useState(initialValues?.birthdate ?? '')
  const [studentPhone, setStudentPhone] = useState(initialValues?.student_phone ?? '')
  const [address, setAddress] = useState(initialValues?.address ?? '')
  const [fatherName, setFatherName] = useState(initialValues?.father_name ?? '')
  const [fatherPhone, setFatherPhone] = useState(initialValues?.father_phone ?? '')
  const [motherName, setMotherName] = useState(initialValues?.mother_name ?? '')
  const [motherPhone, setMotherPhone] = useState(initialValues?.mother_phone ?? '')
  const [emergencyContact, setEmergencyContact] = useState(initialValues?.emergency_contact ?? '')
  const [note, setNote] = useState(initialValues?.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !number.trim()) {
      setError('이름과 출석번호는 필수입니다.')
      return
    }
    setError(null)
    setSubmitting(true)
    await onSubmit({
      number: Number(number),
      name: name.trim(),
      gender,
      birthdate,
      student_phone: studentPhone,
      address,
      father_name: fatherName,
      father_phone: fatherPhone,
      mother_name: motherName,
      mother_phone: motherPhone,
      emergency_contact: emergencyContact,
      note,
    })
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        출석번호
        <input
          type="number"
          required
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        이름
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        성별
        <input
          type="text"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        생년월일
        <input
          type="text"
          placeholder="예: 240304"
          value={birthdate}
          onChange={(e) => setBirthdate(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        학생 전화
        <input
          type="text"
          value={studentPhone}
          onChange={(e) => setStudentPhone(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        주소
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        부 성명
        <input
          type="text"
          value={fatherName}
          onChange={(e) => setFatherName(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        부 전화
        <input
          type="text"
          value={fatherPhone}
          onChange={(e) => setFatherPhone(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        모 성명
        <input
          type="text"
          value={motherName}
          onChange={(e) => setMotherName(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        모 전화
        <input
          type="text"
          value={motherPhone}
          onChange={(e) => setMotherPhone(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        비상연락처
        <input
          type="text"
          value={emergencyContact}
          onChange={(e) => setEmergencyContact(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        비고
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
        >
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded border border-gray-300 px-3 py-2">
          취소
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Update the student list item display**

Replace the full contents of `src/components/StudentListItem.tsx`:

```tsx
import { Link } from 'react-router-dom'
import type { Student } from '../lib/types'

export function StudentListItem({ student }: { student: Student }) {
  return (
    <Link
      to={`/students/${student.id}`}
      className="flex items-center justify-between rounded border border-gray-200 px-4 py-3 hover:bg-gray-50"
    >
      <span className="font-medium">
        {student.number}. {student.name}
      </span>
      <span className="text-sm text-gray-500">
        부 {student.father_phone ?? '-'} · 모 {student.mother_phone ?? '-'}
      </span>
    </Link>
  )
}
```

- [ ] **Step 3: Update the student detail page**

In `src/routes/StudentDetailPage.tsx`, make these three changes (everything else in the file — the record-related handlers, `RecordForm`/`RecordTimeline` wiring, delete confirmation — stays exactly as-is):

Replace the header info line:
```tsx
          <p className="text-sm text-gray-500">
            본인 {student.student_phone ?? '-'} · 학부모 {student.parent_phone ?? '-'}
          </p>
```
with:
```tsx
          <p className="text-sm text-gray-500">
            본인 {student.student_phone ?? '-'} · 부 {student.father_phone ?? '-'} · 모{' '}
            {student.mother_phone ?? '-'}
          </p>
```

Replace `handleUpdateStudent`:
```tsx
  const handleUpdateStudent = async (values: StudentFormValues) => {
    const result = await updateStudent(student.id, {
      number: values.number,
      name: values.name,
      gender: values.gender || null,
      student_phone: values.student_phone || null,
      parent_phone: values.parent_phone || null,
    })
    if (!result.error) {
      setEditingStudent(false)
    }
  }
```
with:
```tsx
  const handleUpdateStudent = async (values: StudentFormValues) => {
    const result = await updateStudent(student.id, {
      number: values.number,
      name: values.name,
      gender: values.gender || null,
      birthdate: values.birthdate || null,
      student_phone: values.student_phone || null,
      address: values.address || null,
      father_name: values.father_name || null,
      father_phone: values.father_phone || null,
      mother_name: values.mother_name || null,
      mother_phone: values.mother_phone || null,
      emergency_contact: values.emergency_contact || null,
      note: values.note || null,
    })
    if (!result.error) {
      setEditingStudent(false)
    }
  }
```

Replace the `StudentForm`'s `initialValues`:
```tsx
            initialValues={{
              number: student.number,
              name: student.name,
              gender: student.gender ?? '',
              student_phone: student.student_phone ?? '',
              parent_phone: student.parent_phone ?? '',
            }}
```
with:
```tsx
            initialValues={{
              number: student.number,
              name: student.name,
              gender: student.gender ?? '',
              birthdate: student.birthdate ?? '',
              student_phone: student.student_phone ?? '',
              address: student.address ?? '',
              father_name: student.father_name ?? '',
              father_phone: student.father_phone ?? '',
              mother_name: student.mother_name ?? '',
              mother_phone: student.mother_phone ?? '',
              emergency_contact: student.emergency_contact ?? '',
              note: student.note ?? '',
            }}
```

- [ ] **Step 4: Update the student list page's add-student handler**

In `src/routes/StudentListPage.tsx`, replace `handleAdd` (everything else in the file — search, `ImportStudentsPanel` wiring, sign-out — stays exactly as-is):

```tsx
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
```
with:
```tsx
  const handleAdd = async (values: StudentFormValues) => {
    const result = await addStudent({
      number: values.number,
      name: values.name,
      gender: values.gender || null,
      birthdate: values.birthdate || null,
      student_phone: values.student_phone || null,
      address: values.address || null,
      father_name: values.father_name || null,
      father_phone: values.father_phone || null,
      mother_name: values.mother_name || null,
      mother_phone: values.mother_phone || null,
      emergency_contact: values.emergency_contact || null,
      note: values.note || null,
    })
    if (!result.error) {
      setShowForm(false)
    }
  }
```

- [ ] **Step 5: Update the CSV import preview**

In `src/components/ImportStudentsPanel.tsx`, replace the valid-rows preview list (the file input, download link, `fileError`/`importError` handling, skipped-rows list, and buttons all stay exactly as-is):

```tsx
          {valid.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {valid.map((row) => (
                <li key={row.number}>
                  {row.number}. {row.name} · {row.gender ?? '-'} · 본인 {row.student_phone ?? '-'} · 학부모{' '}
                  {row.parent_phone ?? '-'}
                </li>
              ))}
            </ul>
          )}
```
with:
```tsx
          {valid.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {valid.map((row) => (
                <li key={row.number}>
                  {row.number}. {row.name} · {row.gender ?? '-'} · 부 {row.father_phone ?? '-'} · 모{' '}
                  {row.mother_phone ?? '-'}
                </li>
              ))}
            </ul>
          )}
```

- [ ] **Step 6: Regenerate the sample CSV files**

Replace the full contents of `public/sample-students.csv` (keep the UTF-8 BOM — the first character must be `﻿`, invisible in most editors, already present as the first character of the file before your edit; if your editor strips it, re-add it):

```
﻿번호,성명,성별,생년월일,학생전번,주소,부성명,부전번,모성명,모전번,비상연락처,비고
1,김민준,남,240304,010-1111-2222,인천시 연수구 컨벤시아대로 1,김철수,010-3333-4444,이영희,010-5555-6666,이모)010-7777-8888,
2,이서연,여,240815,010-2222-3333,서울시 강남구 테헤란로 5,이민수,010-4444-5555,박정숙,010-6666-7777,고모)010-8888-9999,
3,박지후,남,241120,010-3333-4444,경기도 성남시 분당구 판교로 10,박준서,010-5555-6666,김미영,010-7777-8888,삼촌)010-9999-0000,본교 형제자매(2반 박서준)
4,최지우,여,240630,010-4444-5555,인천시 남동구 예술로 15,최영수,010-6666-7777,정수진,010-8888-9999,이모)010-0000-1111,
5,정도윤,남,241005,010-5555-6666,서울시 송파구 올림픽로 20,정민호,010-7777-8888,한지혜,010-9999-0000,고모)010-1111-2222,
```

Replace the full contents of `sample-students.csv` (repo root) with the same content (this copy does not need the BOM — it isn't served to a browser, just kept as a scratch reference):

```
번호,성명,성별,생년월일,학생전번,주소,부성명,부전번,모성명,모전번,비상연락처,비고
1,김민준,남,240304,010-1111-2222,인천시 연수구 컨벤시아대로 1,김철수,010-3333-4444,이영희,010-5555-6666,이모)010-7777-8888,
2,이서연,여,240815,010-2222-3333,서울시 강남구 테헤란로 5,이민수,010-4444-5555,박정숙,010-6666-7777,고모)010-8888-9999,
3,박지후,남,241120,010-3333-4444,경기도 성남시 분당구 판교로 10,박준서,010-5555-6666,김미영,010-7777-8888,삼촌)010-9999-0000,본교 형제자매(2반 박서준)
4,최지우,여,240630,010-4444-5555,인천시 남동구 예술로 15,최영수,010-6666-7777,정수진,010-8888-9999,이모)010-0000-1111,
5,정도윤,남,241005,010-5555-6666,서울시 송파구 올림픽로 20,정민호,010-7777-8888,한지혜,010-9999-0000,고모)010-1111-2222,
```

Verify the BOM is actually present in `public/sample-students.csv` after writing it:

Run: `xxd public/sample-students.csv | head -1`
Expected: the first three bytes are `ef bb bf` (the UTF-8 BOM), immediately followed by the UTF-8 bytes of `번호`.

- [ ] **Step 7: Verify the whole project builds and tests pass**

Run: `npm run build`
Expected: exits 0. This is the key check — it confirms every file that referenced the old 5-field shape (`StudentForm`, `StudentListItem`, `StudentDetailPage`, `StudentListPage`, `ImportStudentsPanel`) now compiles against the new 12-field `Student`/`NewStudent`/`ParsedStudentRow` types from Task 1.

Run: `npm run lint`
Expected: exits 0.

Run: `npm test`
Expected: exits 0, all 10 `csv.ts` tests from Task 1 plus the pre-existing `useStudents`/`useStudentRecords` tests still passing (this task doesn't touch those hooks or their tests).

- [ ] **Step 8: Manual verification**

Run: `npm run dev`, log in.
1. Click "학생 추가" — the form now shows all 12 fields (출석번호, 이름, 성별, 생년월일, 학생 전화, 주소, 부 성명, 부 전화, 모 성명, 모 전화, 비상연락처, 비고). Fill in a few and submit — the student appears in the list showing 부/모 연락처.
2. Open that student's detail page, click "정보 수정" — the form is pre-filled with everything you entered. Change one field and save — it persists.
3. Click "CSV 가져오기", click "샘플 파일 다운로드" — the downloaded file opens correctly in a text editor or Excel with no broken Korean text, and has the 12-column header.
4. Select that same downloaded sample file in the import panel — the preview shows 5 students with 부/모 연락처 visible, "가져오기" adds them all.

- [ ] **Step 9: Commit**

```bash
git add src/components/StudentForm.tsx src/components/StudentListItem.tsx src/routes/StudentDetailPage.tsx src/routes/StudentListPage.tsx src/components/ImportStudentsPanel.tsx sample-students.csv public/sample-students.csv
git commit -m "feat: wire expanded student fields into UI and CSV import"
```
