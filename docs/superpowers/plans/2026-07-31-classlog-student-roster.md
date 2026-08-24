# Classlog MVP: 학생 명부 + 생활기록/상담 기록 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the classlog MVP — teacher login, student roster CRUD, and per-student life/counseling record timelines — on top of the existing Vite + React + TypeScript + Supabase scaffold.

**Architecture:** React Router drives four screens (`/login`, `/students`, `/students/:id`, catch-all redirect). All Supabase access goes through three custom hooks (`useAuth`, `useStudents`, `useStudentRecords`); components never call `supabase` directly. Postgres tables `students` and `records` are scoped per teacher via Row Level Security (`teacher_id = auth.uid()`).

**Tech Stack:** React 19, TypeScript, Vite, react-router-dom, Tailwind CSS v4 (`@tailwindcss/vite`), Supabase (`@supabase/supabase-js`), Vitest + Testing Library for hook unit tests.

## Global Constraints

- All UI copy is in Korean, matching the existing scaffold (`우리 반 앱`).
- Styling uses Tailwind CSS utility classes exclusively (no CSS Modules, no styled-components).
- Data access goes through custom hooks only — components must not import `supabase` directly.
- Record categories are a fixed, closed set: `생활지도`, `학습`, `진로`, `학부모상담`, `기타`. No admin UI to add/edit categories.
- RLS on both `students` and `records` restricts rows to `teacher_id = auth.uid()`.
- Out of scope for this plan (do not build): student/parent-facing views, attendance, announcements, assignments/grades, seating charts, year/class switching with archived history.
- Automated test coverage is limited to the `useStudents` and `useStudentRecords` hooks, per the spec's stated test scope. Other tasks are verified via `npm run build` / `npm run lint` plus manual smoke checks — do not add component or E2E tests beyond what's specified.
- Source spec: `docs/superpowers/specs/2026-07-31-classlog-student-roster-design.md`.

---

### Task 1: Tailwind CSS setup

**Files:**
- Modify: `vite.config.ts`
- Modify: `src/index.css`
- Modify: `src/App.tsx`
- Modify: `package.json` (new devDependencies, added automatically by npm install)

**Interfaces:**
- Produces: Tailwind utility classes (`className="..."`) usable in any `.tsx` file from this point on.

- [ ] **Step 1: Install Tailwind CSS and its Vite plugin**

```bash
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Wire the Tailwind Vite plugin**

Replace the full contents of `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

- [ ] **Step 3: Replace the stylesheet with the Tailwind import**

Replace the full contents of `src/index.css`:

```css
@import "tailwindcss";
```

- [ ] **Step 4: Smoke-test Tailwind with a utility class**

Replace the full contents of `src/App.tsx`:

```tsx
function App() {
  return (
    <div>
      <h1 className="p-6 text-2xl font-semibold">우리 반 앱</h1>
    </div>
  )
}

export default App
```

- [ ] **Step 5: Verify the build compiles**

Run: `npm run build`
Expected: exits 0, no TypeScript or Vite errors, `dist/` is regenerated.

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts src/index.css src/App.tsx package.json package-lock.json
git commit -m "feat: set up Tailwind CSS"
```

---

### Task 2: Vitest + Testing Library setup

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/test/supabaseMock.ts`
- Modify: `package.json` (add `test` script, new devDependencies)

**Interfaces:**
- Produces: `createQueryBuilder<T>(result: { data: T; error: { message: string } | null })` — a chainable fake Supabase query builder for use in `vi.mock('../supabaseClient', ...)`. Every chain method (`select`, `order`, `eq`, `insert`, `update`, `delete`) returns the same builder; `.single()` and awaiting the builder directly both resolve to `result`. Used by Task 5 and Task 7.

- [ ] **Step 1: Install Vitest, jsdom, and Testing Library**

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 2: Create the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    passWithNoTests: true,
  },
})
```

- [ ] **Step 3: Create the test setup file**

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Create the shared Supabase query builder mock**

Create `src/test/supabaseMock.ts`:

```ts
import { vi } from 'vitest'

type QueryResult<T> = { data: T; error: { message: string } | null }

const CHAIN_METHODS = ['select', 'order', 'eq', 'insert', 'update', 'delete'] as const

export function createQueryBuilder<T>(result: QueryResult<T>) {
  const builder: Record<string, unknown> = {}

  for (const method of CHAIN_METHODS) {
    builder[method] = vi.fn(() => builder)
  }

  builder.single = vi.fn(() => Promise.resolve(result))
  builder.then = (
    onFulfilled: (value: QueryResult<T>) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(onFulfilled, onRejected)

  return builder
}
```

- [ ] **Step 5: Add the test script**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run"
```

- [ ] **Step 6: Verify the test runner works with no test files yet**

Run: `npm test`
Expected: exits 0 (passWithNoTests avoids the "no test files found" failure).

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts src/test/setup.ts src/test/supabaseMock.ts package.json package-lock.json
git commit -m "feat: add Vitest and Testing Library for hook unit tests"
```

---

### Task 3: Supabase schema and shared types

**Files:**
- Create: `supabase/schema.sql`
- Create: `src/lib/types.ts`

**Interfaces:**
- Produces: `Student`, `RecordCategory`, `StudentRecord` types from `src/lib/types.ts`, used by every hook and component from Task 5 onward.

- [ ] **Step 1: Write the schema SQL**

Create `supabase/schema.sql`:

```sql
create extension if not exists pgcrypto;

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) default auth.uid(),
  number integer not null,
  name text not null,
  gender text,
  student_phone text,
  parent_phone text,
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
  with check (teacher_id = auth.uid());
```

- [ ] **Step 2: Write the shared TypeScript types**

Create `src/lib/types.ts`:

```ts
export type Student = {
  id: string
  teacher_id: string
  number: number
  name: string
  gender: string | null
  student_phone: string | null
  parent_phone: string | null
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

- [ ] **Step 3: Verify the project still builds**

Run: `npm run build`
Expected: exits 0 (the new file is unused so far, which is fine — it's a type-only module).

- [ ] **Step 4: Apply the schema and prepare a teacher account (manual, one-time)**

This step happens in the Supabase dashboard, not in code:
1. Open the Supabase project's SQL editor and run the contents of `supabase/schema.sql`.
2. Under Authentication → Users, create one user (email + password) to act as the teacher account for manual testing.
3. Fill in `.env` (copied from `.env.example`) with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the project's API settings, if not already done.

- [ ] **Step 5: Commit**

```bash
git add supabase/schema.sql src/lib/types.ts
git commit -m "feat: add Supabase schema and shared domain types"
```

---

### Task 4: Auth, routing skeleton, and login page

**Files:**
- Create: `src/lib/hooks/useAuth.ts`
- Create: `src/routes/LoginPage.tsx`
- Create: `src/routes/ProtectedRoute.tsx`
- Create: `src/routes/StudentListPage.tsx` (stub, replaced fully in Task 6)
- Create: `src/routes/StudentDetailPage.tsx` (stub, replaced fully in Task 8)
- Modify: `src/App.tsx`
- Modify: `package.json` (new dependency)

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabaseClient.ts`.
- Produces: `useAuth()` returning `{ session: Session | null, loading: boolean, signIn(email, password): Promise<{ error: string | null }>, signOut(): Promise<void> }`, used by `LoginPage` and `ProtectedRoute`, and available to any later page that needs to sign out.

- [ ] **Step 1: Install React Router**

```bash
npm install react-router-dom
```

- [ ] **Step 2: Create the auth hook**

Create `src/lib/hooks/useAuth.ts`:

```ts
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { session, loading, signIn, signOut }
}
```

- [ ] **Step 3: Create the login page**

Create `src/routes/LoginPage.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/hooks/useAuth'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    navigate('/students')
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Classlog 로그인</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
        <input
          type="password"
          required
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
        >
          로그인
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Create the route guard**

Create `src/routes/ProtectedRoute.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/hooks/useAuth'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return <p className="p-6">로딩 중...</p>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
```

- [ ] **Step 5: Create page stubs**

Create `src/routes/StudentListPage.tsx`:

```tsx
export function StudentListPage() {
  return <div className="p-6">학생 명부 (준비 중)</div>
}
```

Create `src/routes/StudentDetailPage.tsx`:

```tsx
export function StudentDetailPage() {
  return <div className="p-6">학생 상세 (준비 중)</div>
}
```

- [ ] **Step 6: Wire up the router**

Replace the full contents of `src/App.tsx`:

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './routes/LoginPage'
import { StudentListPage } from './routes/StudentListPage'
import { StudentDetailPage } from './routes/StudentDetailPage'
import { ProtectedRoute } from './routes/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/students"
          element={
            <ProtectedRoute>
              <StudentListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/students/:id"
          element={
            <ProtectedRoute>
              <StudentDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/students" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

- [ ] **Step 7: Verify the build compiles**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 8: Manual verification**

Run: `npm run dev`, open the printed local URL.
1. Visiting `/` or `/students` while logged out redirects to `/login`.
2. Logging in with the teacher account created in Task 3 redirects to `/students`, showing the "준비 중" stub.
3. Manually navigating to `/students/anything` also shows its stub without redirecting to login.

- [ ] **Step 9: Commit**

```bash
git add src/lib/hooks/useAuth.ts src/routes/LoginPage.tsx src/routes/ProtectedRoute.tsx src/routes/StudentListPage.tsx src/routes/StudentDetailPage.tsx src/App.tsx package.json package-lock.json
git commit -m "feat: add login, route guard, and router skeleton"
```

---

### Task 5: `useStudents` hook (TDD)

**Files:**
- Create: `src/lib/hooks/useStudents.ts`
- Test: `src/lib/hooks/useStudents.test.ts`

**Interfaces:**
- Consumes: `supabase` from `../supabaseClient`; `Student` type from `../types`; `createQueryBuilder` from `../../test/supabaseMock` (test only).
- Produces: `useStudents()` returning:
  - `students: Student[]`
  - `loading: boolean`
  - `error: string | null`
  - `addStudent(input: { number: number; name: string; gender: string | null; student_phone: string | null; parent_phone: string | null }): Promise<{ data?: Student; error?: string }>`
  - `updateStudent(id: string, input: Partial<{ number: number; name: string; gender: string | null; student_phone: string | null; parent_phone: string | null }>): Promise<{ data?: Student; error?: string }>`
  - `deleteStudent(id: string): Promise<{ error?: string }>`
  - `refetch(): Promise<void>`

  Used by `StudentListPage` (Task 6) and `StudentDetailPage` (Task 8).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/hooks/useStudents.test.ts`:

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

const { useStudents } = await import('./useStudents')

const studentNum1 = {
  id: '2',
  teacher_id: 't1',
  number: 1,
  name: '이서연',
  gender: null,
  student_phone: null,
  parent_phone: null,
  created_at: '2026-01-01',
}
const studentNum2 = {
  id: '1',
  teacher_id: 't1',
  number: 2,
  name: '김민준',
  gender: null,
  student_phone: null,
  parent_phone: null,
  created_at: '2026-01-01',
}

beforeEach(() => {
  mockFrom.mockReset()
  mockGetUser.mockReset()
})

describe('useStudents', () => {
  it('fetches students on mount', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: [studentNum1, studentNum2], error: null }))

    const { result } = renderHook(() => useStudents())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.students.map((s) => s.id)).toEqual(['2', '1'])
    expect(result.current.error).toBeNull()
  })

  it('surfaces the error message when fetch fails', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: { message: '네트워크 오류' } }))

    const { result } = renderHook(() => useStudents())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('네트워크 오류')
    expect(result.current.students).toEqual([])
  })

  it('adds a student and keeps the list sorted by number', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [studentNum1], error: null }))
    const { result } = renderHook(() => useStudents())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetUser.mockResolvedValue({ data: { user: { id: 't1' } } })
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: studentNum2, error: null }))

    await act(async () => {
      await result.current.addStudent({
        number: 2,
        name: '김민준',
        gender: null,
        student_phone: null,
        parent_phone: null,
      })
    })

    expect(result.current.students.map((s) => s.id)).toEqual(['2', '1'])
  })

  it('deletes a student', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [studentNum1, studentNum2], error: null }))
    const { result } = renderHook(() => useStudents())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: null, error: null }))

    await act(async () => {
      await result.current.deleteStudent('2')
    })

    expect(result.current.students.map((s) => s.id)).toEqual(['1'])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- useStudents`
Expected: FAIL — `Failed to resolve import "./useStudents"` (the module doesn't exist yet).

- [ ] **Step 3: Implement the hook**

Create `src/lib/hooks/useStudents.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Student } from '../types'

type NewStudent = Omit<Student, 'id' | 'teacher_id' | 'created_at'>
type StudentUpdate = Partial<NewStudent>

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('number', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setStudents(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const addStudent = useCallback(async (input: NewStudent) => {
    const { data: userData } = await supabase.auth.getUser()
    const teacherId = userData.user?.id
    if (!teacherId) {
      setError('로그인이 필요합니다.')
      return { error: '로그인이 필요합니다.' }
    }

    const { data, error } = await supabase
      .from('students')
      .insert({ ...input, teacher_id: teacherId })
      .select()
      .single()

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setStudents((prev) => [...prev, data].sort((a, b) => a.number - b.number))
    return { data }
  }, [])

  const updateStudent = useCallback(async (id: string, input: StudentUpdate) => {
    const { data, error } = await supabase
      .from('students')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setStudents((prev) =>
      prev.map((s) => (s.id === id ? data : s)).sort((a, b) => a.number - b.number),
    )
    return { data }
  }, [])

  const deleteStudent = useCallback(async (id: string) => {
    const { error } = await supabase.from('students').delete().eq('id', id)

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setStudents((prev) => prev.filter((s) => s.id !== id))
    return {}
  }, [])

  return { students, loading, error, addStudent, updateStudent, deleteStudent, refetch: fetchStudents }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- useStudents`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/hooks/useStudents.ts src/lib/hooks/useStudents.test.ts
git commit -m "feat: add useStudents hook with tests"
```

---

### Task 6: Student list page

**Files:**
- Create: `src/components/StudentForm.tsx`
- Create: `src/components/StudentListItem.tsx`
- Modify: `src/routes/StudentListPage.tsx` (replace stub with full implementation)

**Interfaces:**
- Consumes: `useStudents()` from Task 5; `Student` type from `../lib/types`.
- Produces: `StudentForm` component with props `{ initialValues?: Partial<StudentFormValues>, onSubmit(values: StudentFormValues): Promise<void> | void, onCancel(): void, submitLabel: string }` where `StudentFormValues = { number: number; name: string; gender: string; student_phone: string; parent_phone: string }`. Reused as-is by `StudentDetailPage` in Task 8 for editing.

- [ ] **Step 1: Create the reusable student form**

Create `src/components/StudentForm.tsx`:

```tsx
import { useState, type FormEvent } from 'react'

export type StudentFormValues = {
  number: number
  name: string
  gender: string
  student_phone: string
  parent_phone: string
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
  const [studentPhone, setStudentPhone] = useState(initialValues?.student_phone ?? '')
  const [parentPhone, setParentPhone] = useState(initialValues?.parent_phone ?? '')
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
      student_phone: studentPhone,
      parent_phone: parentPhone,
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
        본인 연락처
        <input
          type="text"
          value={studentPhone}
          onChange={(e) => setStudentPhone(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        학부모 연락처
        <input
          type="text"
          value={parentPhone}
          onChange={(e) => setParentPhone(e.target.value)}
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

- [ ] **Step 2: Create the list item component**

Create `src/components/StudentListItem.tsx`:

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
      <span className="text-sm text-gray-500">{student.parent_phone ?? ''}</span>
    </Link>
  )
}
```

- [ ] **Step 3: Replace the student list page stub**

Replace the full contents of `src/routes/StudentListPage.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { useStudents } from '../lib/hooks/useStudents'
import { StudentForm, type StudentFormValues } from '../components/StudentForm'
import { StudentListItem } from '../components/StudentListItem'

export function StudentListPage() {
  const { students, loading, error, addStudent } = useStudents()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const filtered = useMemo(
    () => students.filter((s) => s.name.includes(search.trim())),
    [students, search],
  )

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
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded bg-blue-600 px-3 py-2 text-white"
        >
          {showForm ? '닫기' : '학생 추가'}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 rounded border border-gray-200 p-4">
          <StudentForm submitLabel="추가" onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
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

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, log in with the teacher account.
1. Click "학생 추가", fill in 출석번호/이름, submit — the new student appears in the list, sorted by number.
2. Type in the search box — the list filters by name substring.
3. Clicking a student row navigates to `/students/:id` (still shows the Task 4 stub — expected until Task 8).

- [ ] **Step 6: Commit**

```bash
git add src/components/StudentForm.tsx src/components/StudentListItem.tsx src/routes/StudentListPage.tsx
git commit -m "feat: add student list page with add and search"
```

---

### Task 7: `useStudentRecords` hook (TDD)

**Files:**
- Create: `src/lib/hooks/useStudentRecords.ts`
- Test: `src/lib/hooks/useStudentRecords.test.ts`

**Interfaces:**
- Consumes: `supabase` from `../supabaseClient`; `RecordCategory`, `StudentRecord` types from `../types`; `createQueryBuilder` from `../../test/supabaseMock` (test only).
- Produces: `useStudentRecords(studentId: string)` returning:
  - `records: StudentRecord[]` (newest `record_date` first)
  - `loading: boolean`
  - `error: string | null`
  - `addRecord(input: { category: RecordCategory; content: string; record_date: string }): Promise<{ data?: StudentRecord; error?: string }>`
  - `updateRecord(id: string, input: Partial<{ category: RecordCategory; content: string; record_date: string }>): Promise<{ data?: StudentRecord; error?: string }>`
  - `deleteRecord(id: string): Promise<{ error?: string }>`
  - `refetch(): Promise<void>`

  Used by `StudentDetailPage` (Task 8).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/hooks/useStudentRecords.test.ts`:

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

const { useStudentRecords } = await import('./useStudentRecords')

const record1 = {
  id: 'r1',
  student_id: 's1',
  teacher_id: 't1',
  category: '생활지도' as const,
  content: '친구와 다툼 중재',
  record_date: '2026-03-10',
  created_at: '2026-03-10',
}
const record2 = {
  id: 'r2',
  student_id: 's1',
  teacher_id: 't1',
  category: '학습' as const,
  content: '수학 보충 필요',
  record_date: '2026-03-15',
  created_at: '2026-03-15',
}

beforeEach(() => {
  mockFrom.mockReset()
  mockGetUser.mockReset()
})

describe('useStudentRecords', () => {
  it('fetches records for the given student on mount', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: [record2, record1], error: null }))

    const { result } = renderHook(() => useStudentRecords('s1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.records.map((r) => r.id)).toEqual(['r2', 'r1'])
  })

  it('surfaces the error message when fetch fails', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: { message: '네트워크 오류' } }))

    const { result } = renderHook(() => useStudentRecords('s1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('네트워크 오류')
  })

  it('adds a record and keeps newest-first order', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [record1], error: null }))
    const { result } = renderHook(() => useStudentRecords('s1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetUser.mockResolvedValue({ data: { user: { id: 't1' } } })
    const newRecord = {
      id: 'r3',
      student_id: 's1',
      teacher_id: 't1',
      category: '진로' as const,
      content: '장래희망 상담',
      record_date: '2026-03-20',
      created_at: '2026-03-20',
    }
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: newRecord, error: null }))

    await act(async () => {
      await result.current.addRecord({ category: '진로', content: '장래희망 상담', record_date: '2026-03-20' })
    })

    expect(result.current.records.map((r) => r.id)).toEqual(['r3', 'r1'])
  })

  it('removes a record on delete', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [record2, record1], error: null }))
    const { result } = renderHook(() => useStudentRecords('s1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: null, error: null }))

    await act(async () => {
      await result.current.deleteRecord('r1')
    })

    expect(result.current.records.map((r) => r.id)).toEqual(['r2'])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- useStudentRecords`
Expected: FAIL — `Failed to resolve import "./useStudentRecords"` (the module doesn't exist yet).

- [ ] **Step 3: Implement the hook**

Create `src/lib/hooks/useStudentRecords.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { RecordCategory, StudentRecord } from '../types'

type NewRecord = {
  category: RecordCategory
  content: string
  record_date: string
}
type RecordUpdate = Partial<NewRecord>

export function useStudentRecords(studentId: string) {
  const [records, setRecords] = useState<StudentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .eq('student_id', studentId)
      .order('record_date', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setRecords(data ?? [])
    }
    setLoading(false)
  }, [studentId])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const addRecord = useCallback(
    async (input: NewRecord) => {
      const { data: userData } = await supabase.auth.getUser()
      const teacherId = userData.user?.id
      if (!teacherId) {
        setError('로그인이 필요합니다.')
        return { error: '로그인이 필요합니다.' }
      }

      const { data, error } = await supabase
        .from('records')
        .insert({ ...input, student_id: studentId, teacher_id: teacherId })
        .select()
        .single()

      if (error) {
        setError(error.message)
        return { error: error.message }
      }

      setRecords((prev) =>
        [...prev, data].sort((a, b) => (a.record_date < b.record_date ? 1 : -1)),
      )
      return { data }
    },
    [studentId],
  )

  const updateRecord = useCallback(async (id: string, input: RecordUpdate) => {
    const { data, error } = await supabase
      .from('records')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setRecords((prev) =>
      prev
        .map((r) => (r.id === id ? data : r))
        .sort((a, b) => (a.record_date < b.record_date ? 1 : -1)),
    )
    return { data }
  }, [])

  const deleteRecord = useCallback(async (id: string) => {
    const { error } = await supabase.from('records').delete().eq('id', id)

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setRecords((prev) => prev.filter((r) => r.id !== id))
    return {}
  }, [])

  return { records, loading, error, addRecord, updateRecord, deleteRecord, refetch: fetchRecords }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- useStudentRecords`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/hooks/useStudentRecords.ts src/lib/hooks/useStudentRecords.test.ts
git commit -m "feat: add useStudentRecords hook with tests"
```

---

### Task 8: Student detail page

**Files:**
- Create: `src/components/RecordForm.tsx`
- Create: `src/components/RecordTimeline.tsx`
- Modify: `src/routes/StudentDetailPage.tsx` (replace stub with full implementation)

**Interfaces:**
- Consumes: `useStudents()` (Task 5), `useStudentRecords()` (Task 7), `StudentForm` (Task 6), `StudentRecord`/`RecordCategory` types (Task 3).
- Produces: `RecordForm` component with props `{ initialValues?: Partial<RecordFormValues>, onSubmit(values: RecordFormValues): Promise<void> | void, onCancel(): void, submitLabel: string }` where `RecordFormValues = { category: RecordCategory; content: string; record_date: string }`. `RecordTimeline` component with props `{ records: StudentRecord[], onEdit(record: StudentRecord): void, onDelete(id: string): void }`.

- [ ] **Step 1: Create the record form**

Create `src/components/RecordForm.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import type { RecordCategory } from '../lib/types'

const CATEGORIES: RecordCategory[] = ['생활지도', '학습', '진로', '학부모상담', '기타']

export type RecordFormValues = {
  category: RecordCategory
  content: string
  record_date: string
}

type RecordFormProps = {
  initialValues?: Partial<RecordFormValues>
  onSubmit: (values: RecordFormValues) => Promise<void> | void
  onCancel: () => void
  submitLabel: string
}

export function RecordForm({ initialValues, onSubmit, onCancel, submitLabel }: RecordFormProps) {
  const [category, setCategory] = useState<RecordCategory>(initialValues?.category ?? '생활지도')
  const [content, setContent] = useState(initialValues?.content ?? '')
  const [recordDate, setRecordDate] = useState(
    initialValues?.record_date ?? new Date().toISOString().slice(0, 10),
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      setError('내용을 입력하세요.')
      return
    }
    setError(null)
    setSubmitting(true)
    await onSubmit({ category, content: content.trim(), record_date: recordDate })
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        날짜
        <input
          type="date"
          required
          value={recordDate}
          onChange={(e) => setRecordDate(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        카테고리
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as RecordCategory)}
          className="rounded border border-gray-300 px-3 py-2"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        내용
        <textarea
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
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

- [ ] **Step 2: Create the record timeline**

Create `src/components/RecordTimeline.tsx`:

```tsx
import { useMemo, useState } from 'react'
import type { RecordCategory, StudentRecord } from '../lib/types'

const CATEGORIES: RecordCategory[] = ['생활지도', '학습', '진로', '학부모상담', '기타']

type RecordTimelineProps = {
  records: StudentRecord[]
  onEdit: (record: StudentRecord) => void
  onDelete: (id: string) => void
}

export function RecordTimeline({ records, onEdit, onDelete }: RecordTimelineProps) {
  const [filter, setFilter] = useState<RecordCategory | 'all'>('all')

  const filtered = useMemo(
    () => (filter === 'all' ? records : records.filter((r) => r.category === filter)),
    [records, filter],
  )

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded px-3 py-1 text-sm ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          전체
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded px-3 py-1 text-sm ${filter === c ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-3">
        {filtered.map((record) => (
          <li key={record.id} className="rounded border border-gray-200 p-3">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>
                {record.record_date} · {record.category}
              </span>
              <div className="flex gap-2">
                <button onClick={() => onEdit(record)} className="underline">
                  수정
                </button>
                <button onClick={() => onDelete(record.id)} className="underline">
                  삭제
                </button>
              </div>
            </div>
            <p className="mt-1 whitespace-pre-wrap">{record.content}</p>
          </li>
        ))}
        {filtered.length === 0 && <p className="text-gray-500">기록이 없습니다.</p>}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Replace the student detail page stub**

Replace the full contents of `src/routes/StudentDetailPage.tsx`:

```tsx
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStudents } from '../lib/hooks/useStudents'
import { useStudentRecords } from '../lib/hooks/useStudentRecords'
import { StudentForm, type StudentFormValues } from '../components/StudentForm'
import { RecordForm, type RecordFormValues } from '../components/RecordForm'
import { RecordTimeline } from '../components/RecordTimeline'
import type { StudentRecord } from '../lib/types'

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { students, updateStudent, deleteStudent } = useStudents()
  const { records, loading, error, addRecord, updateRecord, deleteRecord } = useStudentRecords(id ?? '')

  const [editingStudent, setEditingStudent] = useState(false)
  const [showRecordForm, setShowRecordForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<StudentRecord | null>(null)

  const student = students.find((s) => s.id === id)

  if (!student) {
    return <p className="p-6">학생 정보를 불러오는 중이거나 존재하지 않습니다.</p>
  }

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

  const handleDeleteStudent = async () => {
    await deleteStudent(student.id)
    navigate('/students')
  }

  const handleAddRecord = async (values: RecordFormValues) => {
    const result = await addRecord(values)
    if (!result.error) {
      setShowRecordForm(false)
    }
  }

  const handleUpdateRecord = async (values: RecordFormValues) => {
    if (!editingRecord) return
    const result = await updateRecord(editingRecord.id, values)
    if (!result.error) {
      setEditingRecord(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link to="/students" className="text-sm text-blue-600 underline">
        ← 명부로
      </Link>

      <div className="mt-3 mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {student.number}. {student.name}
          </h1>
          <p className="text-sm text-gray-500">
            본인 {student.student_phone ?? '-'} · 학부모 {student.parent_phone ?? '-'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditingStudent((v) => !v)}
            className="rounded border border-gray-300 px-3 py-1 text-sm"
          >
            {editingStudent ? '닫기' : '정보 수정'}
          </button>
          <button
            onClick={handleDeleteStudent}
            className="rounded border border-red-300 px-3 py-1 text-sm text-red-600"
          >
            학생 삭제
          </button>
        </div>
      </div>

      {editingStudent && (
        <div className="mb-6 rounded border border-gray-200 p-4">
          <StudentForm
            submitLabel="저장"
            initialValues={student}
            onSubmit={handleUpdateStudent}
            onCancel={() => setEditingStudent(false)}
          />
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">생활기록 / 상담</h2>
        <button
          onClick={() => {
            setEditingRecord(null)
            setShowRecordForm((v) => !v)
          }}
          className="rounded bg-blue-600 px-3 py-2 text-sm text-white"
        >
          기록 추가
        </button>
      </div>

      {showRecordForm && (
        <div className="mb-4 rounded border border-gray-200 p-4">
          <RecordForm submitLabel="추가" onSubmit={handleAddRecord} onCancel={() => setShowRecordForm(false)} />
        </div>
      )}

      {editingRecord && (
        <div className="mb-4 rounded border border-gray-200 p-4">
          <RecordForm
            submitLabel="저장"
            initialValues={editingRecord}
            onSubmit={handleUpdateRecord}
            onCancel={() => setEditingRecord(null)}
          />
        </div>
      )}

      {loading && <p>불러오는 중...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <RecordTimeline
        records={records}
        onEdit={(record) => {
          setShowRecordForm(false)
          setEditingRecord(record)
        }}
        onDelete={deleteRecord}
      />
    </div>
  )
}
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, log in, open a student's detail page.
1. Click "정보 수정", change a field, save — the header updates.
2. Click "기록 추가", fill in date/category/content, submit — it appears in the timeline, newest date first.
3. Click a category filter button — the timeline narrows to that category; "전체" shows all again.
4. Click "수정" on a record, change its content, save — the timeline reflects the change.
5. Click "삭제" on a record — it disappears from the timeline.
6. Click "학생 삭제" — redirects to `/students` and the student is gone from the list.

- [ ] **Step 6: Commit**

```bash
git add src/components/RecordForm.tsx src/components/RecordTimeline.tsx src/routes/StudentDetailPage.tsx
git commit -m "feat: add student detail page with record CRUD and category filter"
```

---

### Task 9: Final polish and documentation

**Files:**
- Modify: `README.md`

**Interfaces:**
- None (documentation only).

- [ ] **Step 1: Document setup and usage**

Replace the full contents of `README.md`:

```markdown
# Classlog

교사가 자기 반 학생 명부와 생활기록/상담 기록을 관리하는 학급관리 대시보드입니다.

## 현재 범위 (MVP)

- 교사 로그인 (이메일/비밀번호)
- 학생 명부 등록/조회/수정/삭제
- 학생별 생활기록/상담 기록 등록/조회/수정/삭제 (카테고리 필터 포함)

향후 단계 계획은 `docs/superpowers/specs/2026-07-31-classlog-student-roster-design.md`의 "향후 단계" 절을 참고하세요.

## 시작하기

1. 의존성 설치

   ```bash
   npm install
   ```

2. Supabase 프로젝트 준비
   - Supabase 프로젝트의 SQL 편집기에서 `supabase/schema.sql`을 실행합니다.
   - Authentication → Users에서 로그인에 사용할 교사 계정을 하나 만듭니다.
   - `.env.example`을 `.env`로 복사하고, Supabase 프로젝트의 API 설정에서 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 값을 채웁니다.

3. 개발 서버 실행

   ```bash
   npm run dev
   ```

## 테스트 / 빌드

```bash
npm test        # useStudents, useStudentRecords 훅 단위 테스트
npm run build   # 타입체크 + 프로덕션 빌드
npm run lint    # oxlint
```
```

- [ ] **Step 2: Run the full verification suite**

Run: `npm run build`
Expected: exits 0.

Run: `npm run lint`
Expected: exits 0, no errors.

Run: `npm test`
Expected: exits 0, all hook tests pass.

- [ ] **Step 3: Full manual smoke test**

Run: `npm run dev`, and walk through the entire flow once end to end:
1. Log in with the teacher account.
2. Add two students.
3. Open one student, add a record in each of the 5 categories.
4. Filter the timeline by category, confirm counts match what was added.
5. Edit the student's contact info and one record; confirm both changes persist after a page refresh.
6. Delete one record and then delete one student; confirm both are gone after a page refresh.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: document classlog MVP setup and usage"
```
