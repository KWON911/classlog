---
render_with_liquid: false
---

# 홈화면 기록 찾기(검색) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈화면 상단에 돋보기 아이콘이 달린 검색창을 추가해, 학생 정보(이름·전화번호 등)/생활기록·상담 내용/출결 사유·비고를 한 번에 검색하고 드롭다운 미리보기에서 바로 해당 위치로 이동할 수 있게 한다.

**Architecture:** 새 훅 `useSearchIndex()`가 전체 `records`/`attendance`를 검색용 최소 컬럼만으로 한 번에 가져오고, 기존 `useStudents()`를 재사용한다. 순수 함수 `searchAll(query, students, records, attendance)`이 매 타이핑마다 클라이언트에서 학생/생활기록/출결 세 그룹으로 매칭·정렬·상한 적용을 수행한다. 새 컴포넌트 `HomeSearchBar`가 이 둘을 조합해 입력창 + 드롭다운 UI를 그리고, `HomePage` 상단에 배치된다.

**Tech Stack:** React 19 + TypeScript, Supabase (`@supabase/supabase-js`), React Router 7, lucide-react, Vitest + Testing Library, Tailwind CSS v4.

## Global Constraints

- 전화번호류 필드(`student_phone`, `father_phone`, `mother_phone`, `emergency_contact`)는 검색어가 **순수 숫자로만** 이루어졌을 때만 매칭 대상이 되고, 그때는 필드에서 숫자만 추출한 값이 검색어로 **끝나는지(suffix)**로 비교한다. 검색어에 숫자 아닌 문자가 하나라도 있으면 전화번호 필드는 건너뛴다.
- 학생 텍스트 필드(이름/성별/생년월일/주소/부모명/비고), 생활기록 `content`, 출결 `note`는 검색어의 숫자 전용 여부와 무관하게 항상 대소문자 무시 부분 문자열(substring) 매칭을 수행한다.
- 검색어가 2자(또는 2자리) 미만이면 드롭다운을 띄우지 않는다.
- 그룹당 최대 5건, 전체 합쳐 최대 8건(우선순위: 학생 > 생활기록 > 출결).
- 조인 대상 학생을 찾을 수 없는 레코드/출결 행은 결과에서 제외한다.
- 검색창은 홈화면에만 배치한다. `HomeSearchBar`는 별도 컴포넌트 테스트를 만들지 않는다(프로젝트 컨벤션 — `src/components/`는 build+lint+브라우저 스모크로 검증). `useSearchIndex`와 `searchAll`은 각각 `src/lib/hooks/`, `src/lib/utils/`에 위치하며 유닛 테스트를 작성한다.

---

## Task 1: 검색 관련 타입 추가

**Files:**
- Modify: `src/lib/types.ts`

**Interfaces:**
- Produces:
  - `SearchRecord = Pick<StudentRecord, 'id' | 'student_id' | 'category' | 'content' | 'record_date'>`
  - `SearchAttendanceEntry = Pick<AttendanceEntry, 'id' | 'student_id' | 'status' | 'reason_category' | 'note' | 'date'>`
  - `StudentSearchResult = { student: Student; matchedLabel: string; matchedValue: string }`
  - `RecordSearchResult = { record: SearchRecord; student: Student }`
  - `AttendanceSearchResult = { entry: SearchAttendanceEntry; student: Student }`
  - `SearchResults = { students: StudentSearchResult[]; records: RecordSearchResult[]; attendance: AttendanceSearchResult[] }`

이 타입들은 순수 데이터 셰이프라 별도 테스트가 필요 없다(TypeScript 컴파일이 검증).

- [ ] **Step 1: `src/lib/types.ts`의 `AttendanceEntry` 타입 정의 뒤, 기존 `WeeklyAttendanceDay` 타입 정의 다음에 추가**

```ts
export type SearchRecord = Pick<StudentRecord, 'id' | 'student_id' | 'category' | 'content' | 'record_date'>
export type SearchAttendanceEntry = Pick<AttendanceEntry, 'id' | 'student_id' | 'status' | 'reason_category' | 'note' | 'date'>

export type StudentSearchResult = { student: Student; matchedLabel: string; matchedValue: string }
export type RecordSearchResult = { record: SearchRecord; student: Student }
export type AttendanceSearchResult = { entry: SearchAttendanceEntry; student: Student }

export type SearchResults = {
  students: StudentSearchResult[]
  records: RecordSearchResult[]
  attendance: AttendanceSearchResult[]
}
```

- [ ] **Step 2: 타입 체크로 검증**

Run: `npm run build`
Expected: `tsc -b` 통과.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add search result types for home search"
```

---

## Task 2: `useSearchIndex` 훅

**Files:**
- Create: `src/lib/hooks/useSearchIndex.ts`
- Test: `src/lib/hooks/useSearchIndex.test.ts`

**Interfaces:**
- Consumes: `supabase` (`src/lib/supabaseClient.ts`), `SearchRecord`/`SearchAttendanceEntry` (Task 1).
- Produces: `useSearchIndex(): { records: SearchRecord[]; attendance: SearchAttendanceEntry[]; loading: boolean; error: string | null }` — Task 4(`HomeSearchBar`)가 그대로 소비.

- [ ] **Step 1: Write the failing test**

`src/lib/hooks/useSearchIndex.test.ts` 새로 작성:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createQueryBuilder } from '../../test/supabaseMock'

const mockFrom = vi.fn()

vi.mock('../supabaseClient', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}))

const { useSearchIndex } = await import('./useSearchIndex')

beforeEach(() => {
  mockFrom.mockReset()
})

describe('useSearchIndex', () => {
  it('fetches records and attendance in parallel with the expected columns', async () => {
    const recordsBuilder = createQueryBuilder({ data: [], error: null })
    const attendanceBuilder = createQueryBuilder({ data: [], error: null })
    mockFrom.mockImplementation((table: string) => (table === 'records' ? recordsBuilder : attendanceBuilder))

    const { result } = renderHook(() => useSearchIndex())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockFrom).toHaveBeenCalledWith('records')
    expect(mockFrom).toHaveBeenCalledWith('attendance')
    expect(recordsBuilder.select).toHaveBeenCalledWith('id, student_id, category, content, record_date')
    expect(attendanceBuilder.select).toHaveBeenCalledWith('id, student_id, status, reason_category, note, date')
  })

  it('returns records and attendance on success', async () => {
    const record = { id: 'r1', student_id: 's1', category: '생활지도', content: '지각 지도', record_date: '2026-08-01' }
    const entry = { id: 'a1', student_id: 's1', status: '결석', reason_category: '질병', note: '감기', date: '2026-08-20' }
    mockFrom.mockImplementation((table: string) =>
      table === 'records'
        ? createQueryBuilder({ data: [record], error: null })
        : createQueryBuilder({ data: [entry], error: null }),
    )

    const { result } = renderHook(() => useSearchIndex())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.records).toEqual([record])
    expect(result.current.attendance).toEqual([entry])
    expect(result.current.error).toBeNull()
  })

  it('keeps the successful group when the other fails, and surfaces the error message', async () => {
    mockFrom.mockImplementation((table: string) =>
      table === 'records'
        ? createQueryBuilder({ data: null, error: { message: '레코드 조회 실패' } })
        : createQueryBuilder({
            data: [{ id: 'a1', student_id: 's1', status: '결석', reason_category: '질병', note: null, date: '2026-08-20' }],
            error: null,
          }),
    )

    const { result } = renderHook(() => useSearchIndex())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.records).toEqual([])
    expect(result.current.attendance).toHaveLength(1)
    expect(result.current.error).toBe('레코드 조회 실패')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useSearchIndex`
Expected: FAIL — `./useSearchIndex` module not found.

- [ ] **Step 3: Write minimal implementation**

`src/lib/hooks/useSearchIndex.ts` 새로 작성:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { SearchAttendanceEntry, SearchRecord } from '../types'

export function useSearchIndex() {
  const [records, setRecords] = useState<SearchRecord[]>([])
  const [attendance, setAttendance] = useState<SearchAttendanceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchIndex = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [recordsResult, attendanceResult] = await Promise.all([
      supabase.from('records').select('id, student_id, category, content, record_date'),
      supabase.from('attendance').select('id, student_id, status, reason_category, note, date'),
    ])

    const errors: string[] = []

    if (recordsResult.error) {
      errors.push(recordsResult.error.message)
    } else {
      setRecords(recordsResult.data ?? [])
    }

    if (attendanceResult.error) {
      errors.push(attendanceResult.error.message)
    } else {
      setAttendance(attendanceResult.data ?? [])
    }

    setError(errors.length > 0 ? errors.join(' / ') : null)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchIndex()
  }, [fetchIndex])

  return { records, attendance, loading, error }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useSearchIndex`
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/hooks/useSearchIndex.ts src/lib/hooks/useSearchIndex.test.ts
git commit -m "feat: add useSearchIndex hook for home search"
```

---

## Task 3: `searchAll` 순수 함수

**Files:**
- Create: `src/lib/utils/searchIndex.ts`
- Test: `src/lib/utils/searchIndex.test.ts`

**Interfaces:**
- Consumes: `Student` (`src/lib/types.ts`, 기존), `SearchRecord`/`SearchAttendanceEntry`/`SearchResults`/`StudentSearchResult`/`RecordSearchResult`/`AttendanceSearchResult` (Task 1).
- Produces: `searchAll(query: string, students: Student[], records: SearchRecord[], attendance: SearchAttendanceEntry[]): SearchResults` — Task 5(`HomeSearchBar`)가 그대로 소비.

- [ ] **Step 1: Write the failing test**

`src/lib/utils/searchIndex.test.ts` 새로 작성:

```ts
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

    expect(result.students).toEqual([{ student: kim, matchedLabel: '이름', matchedValue: '김민준' }])
  })

  it('matches a phone field by suffix when the query is digits-only', () => {
    const result = searchAll('4321', [kim, lee], [], [])

    expect(result.students).toEqual([{ student: lee, matchedLabel: '모전번', matchedValue: '010-9999-4321' }])
  })

  it('excludes phone fields when the query mixes letters and digits', () => {
    // "4321번" contains a non-digit character, so phone-field suffix
    // matching must not apply — only text fields (name, etc.) are checked.
    const result = searchAll('4321번', [kim, lee], [], [])

    expect(result.students).toEqual([])
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
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- searchIndex`
Expected: FAIL — `./searchIndex` module not found (`src/lib/utils/searchIndex.test.ts`가 아직 없는 `src/lib/utils/searchIndex.ts`를 import).

- [ ] **Step 3: Write minimal implementation**

`src/lib/utils/searchIndex.ts` 새로 작성:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- searchIndex`
Expected: PASS, all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/searchIndex.ts src/lib/utils/searchIndex.test.ts
git commit -m "feat: add searchAll for home search matching logic"
```

---

## Task 4: `HomeSearchBar` 컴포넌트

**Files:**
- Create: `src/components/home/HomeSearchBar.tsx`

**Interfaces:**
- Consumes: `useStudents` (`src/lib/hooks/useStudents.ts`, 기존), `useSearchIndex` (Task 2), `searchAll` (Task 3).
- Produces: `HomeSearchBar` 컴포넌트(props 없음) — Task 5(`HomePage`)가 그대로 렌더링.

CLAUDE.md 컨벤션에 따라 이 컴포넌트는 별도 테스트를 만들지 않는다(`npm run build` + `npm run lint` + 브라우저 스모크로 검증, Task 6).

- [ ] **Step 1: 컴포넌트 작성**

`src/components/home/HomeSearchBar.tsx` 새로 작성:

```tsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useStudents } from '../../lib/hooks/useStudents'
import { useSearchIndex } from '../../lib/hooks/useSearchIndex'
import { searchAll } from '../../lib/utils/searchIndex'

function formatAttendanceDate(dateStr: string) {
  const [, month, day] = dateStr.split('-')
  return `${Number(month)}/${Number(day)}`
}

const resultButtonClass =
  'block w-full rounded px-2 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50'
const groupLabelClass = 'px-2 py-1 text-xs font-semibold text-gray-400'

export function HomeSearchBar() {
  const navigate = useNavigate()
  const { students } = useStudents()
  const { records, attendance } = useSearchIndex()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const results = searchAll(query, students, records, attendance)
  const hasQuery = query.trim().length >= 2
  const hasResults = results.students.length > 0 || results.records.length > 0 || results.attendance.length > 0

  const goTo = (path: string) => {
    navigate(path)
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative mb-5">
      <div className="flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3">
        <Search size={16} className="text-gray-400" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false)
          }}
          placeholder="이름, 전화번호, 기록 내용 검색..."
          aria-label="기록 찾기"
          className="w-full text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
      </div>

      {isOpen && hasQuery && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
          {!hasResults ? (
            <p className="px-3 py-2 text-sm text-gray-500">검색 결과가 없습니다.</p>
          ) : (
            <>
              {results.students.length > 0 && (
                <div className="px-1">
                  <p className={groupLabelClass}>학생</p>
                  {results.students.map((r) => (
                    <button
                      key={r.student.id}
                      type="button"
                      onClick={() => goTo(`/students/${r.student.id}`)}
                      className={resultButtonClass}
                    >
                      {r.student.number}번 {r.student.name} · {r.matchedLabel}: {r.matchedValue}
                    </button>
                  ))}
                </div>
              )}

              {results.records.length > 0 && (
                <div className="px-1">
                  <p className={groupLabelClass}>생활기록</p>
                  {results.records.map((r) => (
                    <button
                      key={r.record.id}
                      type="button"
                      onClick={() => goTo(`/students/${r.student.id}`)}
                      className={resultButtonClass}
                    >
                      {r.student.number}번 {r.student.name} · {r.record.category} · {r.record.content}
                    </button>
                  ))}
                </div>
              )}

              {results.attendance.length > 0 && (
                <div className="px-1">
                  <p className={groupLabelClass}>출결</p>
                  {results.attendance.map((r) => (
                    <button
                      key={r.entry.id}
                      type="button"
                      onClick={() => goTo(`/attendance?date=${r.entry.date.replace(/-/g, '')}&student=${r.student.id}`)}
                      className={resultButtonClass}
                    >
                      {r.student.number}번 {r.student.name} · {formatAttendanceDate(r.entry.date)} {r.entry.status}
                      {r.entry.note ? ` · ${r.entry.note}` : ''}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 빌드/린트 확인**

Run: `npm run build && npm run lint`
Expected: 둘 다 에러 없이 통과.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/HomeSearchBar.tsx
git commit -m "feat: add HomeSearchBar component"
```

---

## Task 5: `HomePage`에 검색창 배치

**Files:**
- Modify: `src/routes/HomePage.tsx`

**Interfaces:**
- Consumes: `HomeSearchBar` (Task 4).

- [ ] **Step 1: import 추가**

`src/routes/HomePage.tsx` 상단, 기존 `import { WeeklyAttendanceCard } from '../components/home/WeeklyAttendanceCard'` 바로 아래에 추가:

```ts
import { HomeSearchBar } from '../components/home/HomeSearchBar'
```

- [ ] **Step 2: 헤더 블록과 시간표·식단표 그리드 사이에 배치**

기존:

```tsx
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="시간표·급식 새로고침"
        >
          {isRefreshing ? '새로고침 중...' : '↻ 새로고침'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,42fr)_minmax(0,58fr)]">
```

다음으로 교체:

```tsx
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="시간표·급식 새로고침"
        >
          {isRefreshing ? '새로고침 중...' : '↻ 새로고침'}
        </button>
      </div>

      <HomeSearchBar />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,42fr)_minmax(0,58fr)]">
```

- [ ] **Step 3: 빌드/린트 확인**

Run: `npm run build && npm run lint`
Expected: 둘 다 에러 없이 통과.

- [ ] **Step 4: Commit**

```bash
git add src/routes/HomePage.tsx
git commit -m "feat: show the home search bar on the home page"
```

---

## Task 6: 전체 검증 + 브라우저 스모크 테스트

**Files:** 없음 (검증 전용 태스크).

- [ ] **Step 1: 전체 테스트 스위트 실행**

Run: `npm test`
Expected: 모든 테스트 통과 (신규 11개 + 기존 전부).

- [ ] **Step 2: 빌드 + 린트**

Run: `npm run build && npm run lint`
Expected: 둘 다 에러 없이 통과 (기존 무관한 warning은 그대로 있어도 됨).

- [ ] **Step 3: 브라우저로 실제 동작 확인**

1. `npm run dev` (또는 이미 떠 있는 dev 서버 사용), 로그인.
2. 홈(`/home`)에서 인사말 아래·시간표 카드 위에 돋보기 아이콘이 있는 검색창이 보이는지 확인.
3. 학생 이름 일부(2글자 이상)를 입력 — 드롭다운에 "학생" 그룹으로 해당 학생이 뜨는지 확인.
4. 클릭 시 `/students/:id`로 이동하고, 검색창이 비워지고 드롭다운이 닫히는지 확인.
5. 다시 홈으로 돌아와 학생 전화번호(학생전번/부전번/모전번/비상연락처 중 하나)의 뒷자리 4자리만 입력 — 해당 학생이 "학생" 그룹에 올바른 필드 라벨과 함께 뜨는지 확인.
6. 생활기록/상담에 등록된 내용 중 일부 단어를 입력 — "생활기록" 그룹에 뜨고 클릭 시 해당 학생 상세로 이동하는지 확인.
7. 출결 사유/비고에 등록된 내용 중 일부 단어를 입력 — "출결" 그룹에 뜨고 클릭 시 `/attendance?date=...&student=...`로 이동해 해당 날짜·학생이 강조되는지 확인(기존 딥링크 기능과 연동).
8. 1글자만 입력했을 때 드롭다운이 뜨지 않는지 확인.
9. 아무 결과도 없는 검색어를 입력했을 때 "검색 결과가 없습니다" 문구가 뜨는지 확인.
10. 드롭다운이 열린 상태에서 검색창 바깥을 클릭하거나 `Escape`를 누르면 닫히는지 확인.

문제 발견 시 해당 Task로 돌아가 수정 후 이 Task를 다시 수행한다.

- [ ] **Step 4: 최종 커밋 (필요 시)**

스모크 테스트 중 수정 사항이 있었다면:

```bash
git add -A
git commit -m "fix: address issues found in home search smoke test"
```

수정 사항이 없었다면 이 스텝은 건너뛴다.
