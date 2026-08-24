---
render_with_liquid: false
---

# 출결 관리 + 사이드바 네비게이션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add day-level attendance tracking (결석/지각/조퇴/결과) per student, with a monthly class-wide summary and a per-student cumulative summary, and restructure top-level navigation into a persistent left sidebar (학급기록 / 출결관리 / 명부 관리 / 로그아웃).

**Architecture:** A new `attendance` table stores only exceptions (no row = 출석), following the exact RLS/ownership pattern already used by `records`. Two new hooks (`useAttendance` for the monthly attendance page, `useAttendanceSummary` for the student detail page) follow the existing hook-only Supabase access pattern. A new `AppShell` layout component wraps the existing `ProtectedRoute` `<Outlet/>` content with a fixed sidebar, and two existing UI blocks move: student-roster management (add/CSV import/delete-all) moves out of `StudentListPage` into a new `StudentManagePage`.

**Tech Stack:** React 19 + TypeScript, React Router 7, Supabase (`@supabase/supabase-js` v2), Tailwind CSS v4, Vitest + Testing Library.

## Global Constraints

- Supabase client (`supabase`) is imported only inside `src/lib/hooks/*.ts` — components and routes never call it directly.
- RLS pattern for any new teacher-scoped, student-linked table: `teacher_id = auth.uid()` policy plus a subquery verifying `student_id` belongs to a student owned by the same teacher (copy the exact `records` policy shape from `supabase/schema.sql`).
- Any closed-set value (status/category) must be defined identically in two places: the Postgres `check` constraint and a TypeScript union type in `src/lib/types.ts`.
- Automated tests exist only for `src/lib/` and `src/lib/hooks/*` — components and routes are verified via `npm run build` + `npm run lint` + manual smoke testing, not automated tests.
- Any variable referenced inside a `vi.mock(...)` factory must start with the literal prefix `mock` (e.g. `mockFrom`) — Vitest's hoisting exemption requires this exact prefix, otherwise tests throw `Cannot access before initialization`.
- Test fixtures for sorting/counting/aggregation logic must use mixed, non-uniform data (not already-sorted, not all-identical) — a fixture that already matches the correct output passes even when the underlying logic is broken or missing.
- TypeScript `strictNullChecks` is off project-wide — do not assume the compiler will catch a `string | null` passed where a plain `string` is expected.
- The existing layout-route pattern (a path-less `<Route element={<X/>}>` wrapping child `<Route>`s via `<Outlet/>`, not a wrapper component repeated per route) must be preserved when adding `AppShell` — this avoids the remount/loading-flash bug documented in `CLAUDE.md`.

---

### Task 1: `attendance` table schema and TypeScript types

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `src/lib/types.ts`

**Interfaces:**
- Produces: `AttendanceStatus = '결석' | '지각' | '조퇴' | '결과'`, `AttendanceReasonCategory = '질병' | '미인정' | '인정' | '기타'`, `AttendanceEntry` type (all consumed by Tasks 2, 3, 5, 6, 7).

- [ ] **Step 1: Add the `attendance` table and RLS policy to `supabase/schema.sql`**

Append to the end of `supabase/schema.sql`:

```sql
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) default auth.uid(),
  date date not null,
  status text not null check (status in ('결석', '지각', '조퇴', '결과')),
  reason_category text not null check (reason_category in ('질병', '미인정', '인정', '기타')),
  note text,
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

alter table attendance enable row level security;

create policy "teachers manage own attendance" on attendance
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

This is a brand-new table, so unlike a column change to `students`/`records`, `create table if not exists` is safe to re-run against a project that already has the other tables — no drop/recreate needed.

- [ ] **Step 2: Add the attendance types to `src/lib/types.ts`**

Append to `src/lib/types.ts`:

```ts
export type AttendanceStatus = '결석' | '지각' | '조퇴' | '결과'
export type AttendanceReasonCategory = '질병' | '미인정' | '인정' | '기타'

export type AttendanceEntry = {
  id: string
  student_id: string
  teacher_id: string
  date: string
  status: AttendanceStatus
  reason_category: AttendanceReasonCategory
  note: string | null
  created_at: string
}
```

- [ ] **Step 3: Verify the project still builds**

Run: `npm run build`
Expected: succeeds with no type errors (the new types are unused so far, which is not an error).

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql src/lib/types.ts
git commit -m "feat: add attendance table schema and types"
```

**Note for whoever applies this to the live Supabase project:** run the appended SQL in the Supabase SQL editor. Since `attendance` doesn't exist yet, this is a plain create — no need to drop `students`/`records` first.

---

### Task 2: `useAttendance` hook (monthly entries, upsert, clear)

**Files:**
- Modify: `src/test/supabaseMock.ts`
- Create: `src/lib/hooks/useAttendance.ts`
- Test: `src/lib/hooks/useAttendance.test.ts`

**Interfaces:**
- Consumes: `AttendanceStatus`, `AttendanceReasonCategory`, `AttendanceEntry` from `src/lib/types.ts` (Task 1).
- Produces: `useAttendance(yearMonth: string): { entries: AttendanceEntry[], loading: boolean, error: string | null, upsertEntry(studentId: string, date: string, input: { status: AttendanceStatus, reason_category: AttendanceReasonCategory, note: string | null }): Promise<{ data?: AttendanceEntry, error?: string }>, clearEntry(studentId: string, date: string): Promise<{ error?: string }>, refetch: () => Promise<void> }`. Consumed by Task 5 (`AttendancePage`).

- [ ] **Step 1: Add the missing chain methods to the shared Supabase mock**

`src/test/supabaseMock.ts` currently only fakes `select/order/eq/insert/update/delete`. The new hook needs `gte`, `lt` (month range filtering) and `upsert`. Modify the `CHAIN_METHODS` list:

```ts
const CHAIN_METHODS = ['select', 'order', 'eq', 'gte', 'lt', 'insert', 'update', 'upsert', 'delete'] as const
```

- [ ] **Step 2: Write the failing test file**

Create `src/lib/hooks/useAttendance.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createQueryBuilder } from '../../test/supabaseMock'

const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  },
}))

const { useAttendance } = await import('./useAttendance')

const entryA = {
  id: 'a1',
  student_id: 's1',
  teacher_id: 't1',
  date: '2026-08-05',
  status: '결석' as const,
  reason_category: '질병' as const,
  note: null,
  created_at: '2026-08-05',
}

beforeEach(() => {
  mockFrom.mockReset()
  mockGetUser.mockReset()
})

describe('useAttendance', () => {
  it('fetches entries within the given month range', async () => {
    const builder = createQueryBuilder({ data: [entryA], error: null })
    mockFrom.mockReturnValue(builder)

    const { result } = renderHook(() => useAttendance('2026-08'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(builder.gte).toHaveBeenCalledWith('date', '2026-08-01')
    expect(builder.lt).toHaveBeenCalledWith('date', '2026-09-01')
    expect(result.current.entries).toEqual([entryA])
  })

  it('rolls over into next year when the month is December', async () => {
    const builder = createQueryBuilder({ data: [], error: null })
    mockFrom.mockReturnValue(builder)

    const { result } = renderHook(() => useAttendance('2026-12'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(builder.gte).toHaveBeenCalledWith('date', '2026-12-01')
    expect(builder.lt).toHaveBeenCalledWith('date', '2027-01-01')
  })

  it('surfaces the error message when fetch fails', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: { message: '네트워크 오류' } }))

    const { result } = renderHook(() => useAttendance('2026-08'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('네트워크 오류')
  })

  it('upserts an entry with onConflict on student_id,date', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [], error: null }))
    const { result } = renderHook(() => useAttendance('2026-08'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetUser.mockResolvedValue({ data: { user: { id: 't1' } } })
    const upsertBuilder = createQueryBuilder({ data: entryA, error: null })
    mockFrom.mockReturnValueOnce(upsertBuilder)

    await act(async () => {
      await result.current.upsertEntry('s1', '2026-08-05', {
        status: '결석',
        reason_category: '질병',
        note: null,
      })
    })

    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      { student_id: 's1', teacher_id: 't1', date: '2026-08-05', status: '결석', reason_category: '질병', note: null },
      { onConflict: 'student_id,date' },
    )
    expect(result.current.entries).toEqual([entryA])
  })

  it('clears an entry by student and date', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [entryA], error: null }))
    const { result } = renderHook(() => useAttendance('2026-08'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const deleteBuilder = createQueryBuilder({ data: null, error: null })
    mockFrom.mockReturnValueOnce(deleteBuilder)

    await act(async () => {
      await result.current.clearEntry('s1', '2026-08-05')
    })

    expect(deleteBuilder.eq).toHaveBeenCalledWith('student_id', 's1')
    expect(deleteBuilder.eq).toHaveBeenCalledWith('date', '2026-08-05')
    expect(result.current.entries).toEqual([])
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- useAttendance`
Expected: FAIL — `Failed to resolve import "./useAttendance"` (the hook doesn't exist yet).

- [ ] **Step 4: Implement the hook**

Create `src/lib/hooks/useAttendance.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { AttendanceEntry, AttendanceReasonCategory, AttendanceStatus } from '../types'

type EntryInput = {
  status: AttendanceStatus
  reason_category: AttendanceReasonCategory
  note: string | null
}

function monthRange(yearMonth: string) {
  const [yearStr, monthStr] = yearMonth.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const start = `${yearMonth}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
  return { start, end }
}

export function useAttendance(yearMonth: string) {
  const [entries, setEntries] = useState<AttendanceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { start, end } = monthRange(yearMonth)
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .gte('date', start)
      .lt('date', end)

    if (error) {
      setError(error.message)
    } else {
      setEntries(data ?? [])
    }
    setLoading(false)
  }, [yearMonth])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const upsertEntry = useCallback(async (studentId: string, date: string, input: EntryInput) => {
    const { data: userData } = await supabase.auth.getUser()
    const teacherId = userData.user?.id
    if (!teacherId) {
      setError('로그인이 필요합니다.')
      return { error: '로그인이 필요합니다.' }
    }

    const { data, error } = await supabase
      .from('attendance')
      .upsert(
        { student_id: studentId, teacher_id: teacherId, date, ...input },
        { onConflict: 'student_id,date' },
      )
      .select()
      .single()

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setEntries((prev) => [
      ...prev.filter((e) => !(e.student_id === studentId && e.date === date)),
      data,
    ])
    return { data }
  }, [])

  const clearEntry = useCallback(async (studentId: string, date: string) => {
    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('student_id', studentId)
      .eq('date', date)

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setEntries((prev) => prev.filter((e) => !(e.student_id === studentId && e.date === date)))
    return {}
  }, [])

  return { entries, loading, error, upsertEntry, clearEntry, refetch: fetchEntries }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- useAttendance`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/test/supabaseMock.ts src/lib/hooks/useAttendance.ts src/lib/hooks/useAttendance.test.ts
git commit -m "feat: add useAttendance hook for monthly attendance entries"
```

---

### Task 3: `useAttendanceSummary` hook (per-student cumulative counts)

**Files:**
- Create: `src/lib/hooks/useAttendanceSummary.ts`
- Test: `src/lib/hooks/useAttendanceSummary.test.ts`

**Interfaces:**
- Consumes: `AttendanceStatus` from `src/lib/types.ts` (Task 1).
- Produces: `useAttendanceSummary(studentId: string): { summary: Record<AttendanceStatus, number>, loading: boolean, error: string | null, refetch: () => Promise<void> }`. Consumed by Task 7 (`StudentDetailPage`).

- [ ] **Step 1: Write the failing test file**

Create `src/lib/hooks/useAttendanceSummary.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createQueryBuilder } from '../../test/supabaseMock'

const mockFrom = vi.fn()

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

const { useAttendanceSummary } = await import('./useAttendanceSummary')

beforeEach(() => {
  mockFrom.mockReset()
})

describe('useAttendanceSummary', () => {
  it('counts each status from a mixed, unsorted fixture', async () => {
    const builder = createQueryBuilder({
      data: [{ status: '지각' }, { status: '결석' }, { status: '결석' }, { status: '조퇴' }],
      error: null,
    })
    mockFrom.mockReturnValue(builder)

    const { result } = renderHook(() => useAttendanceSummary('s1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(builder.eq).toHaveBeenCalledWith('student_id', 's1')
    expect(result.current.summary).toEqual({ 결석: 2, 지각: 1, 조퇴: 1, 결과: 0 })
  })

  it('returns all-zero counts when the student has no attendance rows', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: [], error: null }))

    const { result } = renderHook(() => useAttendanceSummary('s1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.summary).toEqual({ 결석: 0, 지각: 0, 조퇴: 0, 결과: 0 })
  })

  it('surfaces the error message when fetch fails', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: { message: '네트워크 오류' } }))

    const { result } = renderHook(() => useAttendanceSummary('s1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('네트워크 오류')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- useAttendanceSummary`
Expected: FAIL — `Failed to resolve import "./useAttendanceSummary"`.

- [ ] **Step 3: Implement the hook**

Create `src/lib/hooks/useAttendanceSummary.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { AttendanceStatus } from '../types'

export type AttendanceSummary = Record<AttendanceStatus, number>

const EMPTY_SUMMARY: AttendanceSummary = { 결석: 0, 지각: 0, 조퇴: 0, 결과: 0 }

export function useAttendanceSummary(studentId: string) {
  const [summary, setSummary] = useState<AttendanceSummary>(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', studentId)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const counts: AttendanceSummary = { ...EMPTY_SUMMARY }
    for (const row of (data ?? []) as { status: AttendanceStatus }[]) {
      counts[row.status] += 1
    }
    setSummary(counts)
    setLoading(false)
  }, [studentId])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return { summary, loading, error, refetch: fetchSummary }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- useAttendanceSummary`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/hooks/useAttendanceSummary.ts src/lib/hooks/useAttendanceSummary.test.ts
git commit -m "feat: add useAttendanceSummary hook for per-student cumulative counts"
```

---

### Task 4: Extract `StudentManagePage`, simplify `StudentListPage`

**Files:**
- Create: `src/routes/StudentManagePage.tsx`
- Modify: `src/routes/StudentListPage.tsx`

**Interfaces:**
- Consumes: `useStudents()` from `src/lib/hooks/useStudents.ts` (existing, unchanged), `StudentForm`/`StudentFormValues` and `ImportStudentsPanel` (existing, unchanged).
- Produces: `StudentManagePage` component (default export style matches existing routes — named export `StudentManagePage`), consumed by Task 6 (`App.tsx` routing).

- [ ] **Step 1: Create `StudentManagePage.tsx` with the roster-management UI moved out of `StudentListPage`**

Create `src/routes/StudentManagePage.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { useStudents } from '../lib/hooks/useStudents'
import { StudentForm, type StudentFormValues } from '../components/StudentForm'
import { ImportStudentsPanel } from '../components/ImportStudentsPanel'

export function StudentManagePage() {
  const { students, error, addStudent, addStudents, deleteAllStudents } = useStudents()
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const existingNumbers = useMemo(() => new Set(students.map((s) => s.number)), [students])

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

  const handleDeleteAll = async () => {
    if (students.length === 0) return
    if (
      !window.confirm(
        `정말 전체 학생 ${students.length}명을 삭제하시겠어요? 연결된 모든 생활기록도 함께 삭제되며 되돌릴 수 없습니다.`,
      )
    ) {
      return
    }
    await deleteAllStudents()
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">명부 관리</h1>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      <div className="mb-4 flex gap-2">
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
          onClick={handleDeleteAll}
          className="rounded border border-red-300 px-3 py-2 text-sm text-red-600"
        >
          전체 삭제
        </button>
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
    </div>
  )
}
```

- [ ] **Step 2: Simplify `StudentListPage.tsx` to search + grid only**

Replace the full contents of `src/routes/StudentListPage.tsx` with:

```tsx
import { useMemo, useState } from 'react'
import { useStudents } from '../lib/hooks/useStudents'
import { StudentListItem } from '../components/StudentListItem'

export function StudentListPage() {
  const { students, loading, error } = useStudents()
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () => students.filter((s) => s.name.includes(search.trim())),
    [students, search],
  )

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">학생 명부</h1>

      <input
        type="text"
        placeholder="이름 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded border border-gray-300 px-3 py-2"
      />

      {loading && <p>불러오는 중...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {filtered.map((student) => (
          <StudentListItem key={student.id} student={student} />
        ))}
      </div>
    </div>
  )
}
```

The page heading text stays "학생 명부" — only the sidebar tab label (added in Task 6) is "학급기록"; the page's own content is unchanged internally.

- [ ] **Step 3: Verify build and lint**

Run: `npm run build`
Expected: succeeds. Note `App.tsx` still only routes to `/students` and `/students/:id` at this point — `StudentManagePage` isn't wired into routing yet (that happens in Task 6), so an unused-export lint warning for `StudentManagePage` is expected and will resolve once Task 6 wires it in.

Run: `npm run lint`
Expected: no errors (an unused-file warning, if any, is not a lint error under this project's oxlint config — verify no failures are reported).

- [ ] **Step 4: Commit**

```bash
git add src/routes/StudentManagePage.tsx src/routes/StudentListPage.tsx
git commit -m "refactor: extract roster management UI into StudentManagePage"
```

---

### Task 5: `AttendancePage` (daily entry + monthly class summary)

**Files:**
- Create: `src/components/AttendanceEditRow.tsx`
- Create: `src/routes/AttendancePage.tsx`

**Interfaces:**
- Consumes: `useStudents()` (existing), `useAttendance(yearMonth)` from Task 2 (`entries`, `loading`, `error`, `upsertEntry`, `clearEntry`), `AttendanceStatus`/`AttendanceReasonCategory` from Task 1.
- Produces: `AttendancePage` component, consumed by Task 6 (`App.tsx` routing). `AttendanceEditRow` is internal to this page only.

- [ ] **Step 1: Create the inline edit-row component**

Create `src/components/AttendanceEditRow.tsx`:

```tsx
import { useState } from 'react'
import type { AttendanceReasonCategory, AttendanceStatus } from '../lib/types'

const STATUSES: AttendanceStatus[] = ['결석', '지각', '조퇴', '결과']
const REASONS: AttendanceReasonCategory[] = ['질병', '미인정', '인정', '기타']

type AttendanceEditRowProps = {
  initialStatus?: AttendanceStatus
  initialReasonCategory?: AttendanceReasonCategory
  initialNote?: string
  onSave: (status: AttendanceStatus, reasonCategory: AttendanceReasonCategory, note: string) => void
  onClear?: () => void
  onCancel: () => void
}

export function AttendanceEditRow({
  initialStatus,
  initialReasonCategory,
  initialNote,
  onSave,
  onClear,
  onCancel,
}: AttendanceEditRowProps) {
  const [status, setStatus] = useState<AttendanceStatus>(initialStatus ?? '결석')
  const [reasonCategory, setReasonCategory] = useState<AttendanceReasonCategory>(
    initialReasonCategory ?? '질병',
  )
  const [note, setNote] = useState(initialNote ?? '')

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
        className="rounded border border-gray-300 px-2 py-1 text-sm"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select
        value={reasonCategory}
        onChange={(e) => setReasonCategory(e.target.value as AttendanceReasonCategory)}
        className="rounded border border-gray-300 px-2 py-1 text-sm"
      >
        {REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="메모"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-sm"
      />
      <button
        onClick={() => onSave(status, reasonCategory, note)}
        className="rounded bg-blue-600 px-3 py-1 text-sm text-white"
      >
        저장
      </button>
      {onClear && (
        <button onClick={onClear} className="rounded border border-gray-300 px-3 py-1 text-sm">
          출석으로 되돌리기
        </button>
      )}
      <button onClick={onCancel} className="rounded border border-gray-300 px-3 py-1 text-sm">
        취소
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create the attendance page**

Create `src/routes/AttendancePage.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { useStudents } from '../lib/hooks/useStudents'
import { useAttendance } from '../lib/hooks/useAttendance'
import { AttendanceEditRow } from '../components/AttendanceEditRow'
import type { AttendanceReasonCategory, AttendanceStatus } from '../lib/types'

const STATUSES: AttendanceStatus[] = ['결석', '지각', '조퇴', '결과']

function todayYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function todayDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function shiftMonth(yearMonth: string, delta: number) {
  const [year, month] = yearMonth.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function daysInMonth(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

export function AttendancePage() {
  const [yearMonth, setYearMonth] = useState(todayYearMonth())
  const [selectedDate, setSelectedDate] = useState(todayDate())
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)

  const { students } = useStudents()
  const { entries, loading, error, upsertEntry, clearEntry } = useAttendance(yearMonth)

  const entryByStudentAndDate = useMemo(() => {
    const map = new Map<string, (typeof entries)[number]>()
    for (const entry of entries) {
      map.set(`${entry.student_id}_${entry.date}`, entry)
    }
    return map
  }, [entries])

  const summaryByStudent = useMemo(() => {
    const table = new Map<string, Record<AttendanceStatus, number>>()
    for (const student of students) {
      table.set(student.id, { 결석: 0, 지각: 0, 조퇴: 0, 결과: 0 })
    }
    for (const entry of entries) {
      const row = table.get(entry.student_id)
      if (row) {
        row[entry.status] += 1
      }
    }
    return table
  }, [students, entries])

  const handleSave = async (
    studentId: string,
    status: AttendanceStatus,
    reasonCategory: AttendanceReasonCategory,
    note: string,
  ) => {
    const result = await upsertEntry(studentId, selectedDate, {
      status,
      reason_category: reasonCategory,
      note: note || null,
    })
    if (!result.error) {
      setEditingStudentId(null)
    }
  }

  const handleClear = async (studentId: string) => {
    await clearEntry(studentId, selectedDate)
    setEditingStudentId(null)
  }

  const days = Array.from({ length: daysInMonth(yearMonth) }, (_, i) => i + 1)

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">출결관리</h1>

      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => setYearMonth((prev) => shiftMonth(prev, -1))}
          className="rounded border border-gray-300 px-2 py-1"
        >
          ◀
        </button>
        <span className="font-medium">{yearMonth}</span>
        <button
          onClick={() => setYearMonth((prev) => shiftMonth(prev, 1))}
          className="rounded border border-gray-300 px-2 py-1"
        >
          ▶
        </button>
        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1"
        >
          {days.map((day) => {
            const date = `${yearMonth}-${String(day).padStart(2, '0')}`
            return (
              <option key={date} value={date}>
                {day}일
              </option>
            )
          })}
        </select>
      </div>

      {loading && <p>불러오는 중...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <ul className="mb-8 flex flex-col gap-2">
        {students.map((student) => {
          const entry = entryByStudentAndDate.get(`${student.id}_${selectedDate}`)
          const isEditing = editingStudentId === student.id
          return (
            <li key={student.id} className="rounded border border-gray-200 p-3">
              <button
                onClick={() => setEditingStudentId(isEditing ? null : student.id)}
                className="flex w-full items-center justify-between text-left"
              >
                <span>
                  {student.number}. {student.name}
                </span>
                <span className={entry ? 'text-red-600' : 'text-gray-400'}>
                  {entry ? `${entry.status} (${entry.reason_category})` : '출석'}
                </span>
              </button>

              {isEditing && (
                <AttendanceEditRow
                  initialStatus={entry?.status}
                  initialReasonCategory={entry?.reason_category}
                  initialNote={entry?.note ?? undefined}
                  onSave={(status, reasonCategory, note) =>
                    handleSave(student.id, status, reasonCategory, note)
                  }
                  onClear={entry ? () => handleClear(student.id) : undefined}
                  onCancel={() => setEditingStudentId(null)}
                />
              )}
            </li>
          )
        })}
      </ul>

      <h2 className="mb-2 text-lg font-semibold">{yearMonth} 학급 전체 요약</h2>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-300 text-left">
            <th className="py-1">학생</th>
            {STATUSES.map((status) => (
              <th key={status} className="py-1 text-center">
                {status}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const row = summaryByStudent.get(student.id)
            return (
              <tr key={student.id} className="border-b border-gray-100">
                <td className="py-1">
                  {student.number}. {student.name}
                </td>
                {STATUSES.map((status) => (
                  <td key={status} className="py-1 text-center">
                    {row?.[status] ?? 0}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Verify build and lint**

Run: `npm run build`
Expected: succeeds with no type errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/AttendanceEditRow.tsx src/routes/AttendancePage.tsx
git commit -m "feat: add AttendancePage for daily entry and monthly class summary"
```

---

### Task 6: `AppShell` sidebar layout and routing

**Files:**
- Create: `src/components/AppShell.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useAuth()` (existing, for `signOut`), `StudentListPage`, `StudentDetailPage`, `StudentManagePage` (Task 4), `AttendancePage` (Task 5).
- Produces: `AppShell` component nested as a layout route inside `ProtectedRoute` in `App.tsx`.

- [ ] **Step 1: Create the sidebar layout component**

Create `src/components/AppShell.tsx`:

```tsx
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/hooks/useAuth'

function linkClass(active: boolean) {
  return `rounded px-3 py-2 text-sm ${active ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`
}

export function AppShell() {
  const { signOut } = useAuth()
  const location = useLocation()

  const rosterActive =
    location.pathname === '/students' ||
    (location.pathname.startsWith('/students/') && location.pathname !== '/students/manage')

  return (
    <div className="flex min-h-screen">
      <nav className="flex w-48 flex-col gap-1 border-r border-gray-200 p-4">
        <NavLink to="/students" className={() => linkClass(rosterActive)}>
          학급기록
        </NavLink>
        <NavLink to="/attendance" className={({ isActive }) => linkClass(isActive)}>
          출결관리
        </NavLink>
        <div className="flex-1" />
        <NavLink to="/students/manage" className={({ isActive }) => linkClass(isActive)}>
          명부 관리
        </NavLink>
        <button
          onClick={() => signOut()}
          className="rounded border border-gray-300 px-3 py-2 text-left text-sm"
        >
          로그아웃
        </button>
      </nav>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
```

`rosterActive` is computed manually (not via `NavLink`'s built-in `isActive`) because `/students` needs prefix-matching against `/students/:id` while excluding the sibling route `/students/manage`, which `NavLink`'s `end`-less default matching can't express on its own.

- [ ] **Step 2: Wire `AppShell` into the route tree**

Replace the full contents of `src/App.tsx` with:

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './routes/LoginPage'
import { StudentListPage } from './routes/StudentListPage'
import { StudentDetailPage } from './routes/StudentDetailPage'
import { StudentManagePage } from './routes/StudentManagePage'
import { AttendancePage } from './routes/AttendancePage'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { AppShell } from './components/AppShell'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/students" element={<StudentListPage />} />
            <Route path="/students/:id" element={<StudentDetailPage />} />
            <Route path="/students/manage" element={<StudentManagePage />} />
            <Route path="/attendance" element={<AttendancePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/students" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

`AppShell` is nested as a second path-less layout route inside `ProtectedRoute`, mirroring the existing pattern (a layout route via `<Outlet/>`, not a wrapper repeated per route) — this keeps the sidebar mounted across navigation between all four child routes instead of remounting on every route change.

- [ ] **Step 3: Verify build and lint**

Run: `npm run build`
Expected: succeeds with no type errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`, open the app in a browser, log in, and confirm:
- The sidebar (학급기록 / 출결관리 / 명부 관리 / 로그아웃) is visible and stays mounted while navigating between all four pages.
- "학급기록" is highlighted on both `/students` and `/students/:id`, but not on `/students/manage`.
- "명부 관리" shows the add/CSV-import/delete-all UI and functions the same as before the move.
- 로그아웃 signs out and redirects to `/login`.

- [ ] **Step 5: Commit**

```bash
git add src/components/AppShell.tsx src/App.tsx
git commit -m "feat: add sidebar navigation (AppShell) and wire up new routes"
```

---

### Task 7: Cumulative attendance summary on `StudentDetailPage`

**Files:**
- Modify: `src/routes/StudentDetailPage.tsx:1-27` (imports and hook calls near the top of the component)

**Interfaces:**
- Consumes: `useAttendanceSummary(studentId)` from Task 3 (`summary: Record<AttendanceStatus, number>`).

- [ ] **Step 1: Import the hook and call it alongside the existing hooks**

In `src/routes/StudentDetailPage.tsx`, add the import next to the other hook imports (after the `useStudentRecords` import on line 4):

```tsx
import { useAttendanceSummary } from '../lib/hooks/useAttendanceSummary'
```

Add the hook call right after the existing `useStudentRecords` call (after line 20, `const { records, loading, error, addRecord, updateRecord, deleteRecord } = useStudentRecords(id ?? '')`):

```tsx
const { summary: attendanceSummary } = useAttendanceSummary(id ?? '')
```

- [ ] **Step 2: Render the cumulative summary line**

In the header block, add the summary line right after the closing `</div>` of the title/buttons row (after line 116, before the `{studentsError && ...}` line):

```tsx
<p className="mb-6 text-sm text-gray-600">
  결석 {attendanceSummary.결석} · 지각 {attendanceSummary.지각} · 조퇴 {attendanceSummary.조퇴} · 결과{' '}
  {attendanceSummary.결과}
</p>
```

This is always visible (not behind the "상세정보 보기" toggle), separate from the existing 12-field `<dl>` block.

- [ ] **Step 3: Verify build and lint**

Run: `npm run build`
Expected: succeeds with no type errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual smoke test**

With the dev server running, open a student's detail page and confirm the summary line renders `결석 0 · 지각 0 · 조퇴 0 · 결과 0` for a student with no attendance records, and updates correctly after recording an exception for that student on `/attendance`.

- [ ] **Step 5: Commit**

```bash
git add src/routes/StudentDetailPage.tsx
git commit -m "feat: show cumulative attendance summary on student detail page"
```
