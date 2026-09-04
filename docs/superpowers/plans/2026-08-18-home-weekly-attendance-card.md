# 홈화면 주간 출결 캘린더 카드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈화면에 선택된 주(월~금)의 출결관리 입력 내용을 학생별 배지로 보여주는 세 번째 카드를 추가한다.

**Architecture:** 새 Supabase 훅(`useWeeklyAttendance`)이 날짜 범위로 `attendance`를 `students`와 조인해 조회하고, 순수 함수(`groupAttendanceByDate`)가 요일별로 상태 우선순위→번호순 정렬한다. 새 컴포넌트(`WeeklyAttendanceCard`)가 기존 `WeeklyMealCard`와 동일한 카드 레이아웃 패턴으로 렌더링하고, `HomePage`의 기존 시간표/식단표 그리드 아래 전체 폭으로 배치된다.

**Tech Stack:** React 19 + TypeScript, Supabase (`@supabase/supabase-js`), Vitest + Testing Library, Tailwind CSS v4.

## Global Constraints

- 데이터 접근은 훅 전용 — 컴포넌트는 절대 `supabase`를 직접 호출하지 않는다 (`AGENTS.md`의 데이터 접근 경계).
- `vi.mock(...)` 팩토리 안에서 참조하는 변수명은 반드시 `mock`으로 시작해야 한다 (Vitest 호이스팅 규칙, 그렇지 않으면 `Cannot access before initialization`).
- 정렬을 검증하는 테스트는 픽스처가 이미 정렬된 순서로 주어지면 안 된다 — naive(정렬 안 함) 구현으로도 우연히 통과하지 않도록, 입력 순서와 다른 결과가 나오는 픽스처를 사용한다.
- 컴포넌트(`WeeklyAttendanceCard`) 자체는 별도 컴포넌트 테스트를 만들지 않는다 — `npm run build` + `npm run lint` + 브라우저 수동 스모크 테스트로 검증 (`src/components/`는 테스트 대상 밖).
- 배지 색은 기존 `ATTENDANCE_STATUS_COLOR_CLASS`(`src/lib/utils/attendanceStatusColors.ts`)를 재사용하고 새 색 매핑을 만들지 않는다.

---

## Task 1: `date-utils`에 대시 포함 날짜 포맷 헬퍼 추가

**Files:**
- Modify: `src/lib/utils/date-utils.ts`
- Test: `src/lib/utils/date-utils.test.ts`

**Interfaces:**
- Produces: `yyyymmddDash(d: Date): string` — `'YYYY-MM-DD'` 포맷 (Supabase `attendance.date` 컬럼과 동일한 포맷; 기존 `yyyymmdd`는 대시 없는 `'YYYYMMDD'`라 그대로 못 씀).

- [ ] **Step 1: Write the failing test**

`src/lib/utils/date-utils.test.ts`의 `yyyymmdd` describe 블록 바로 아래에 추가:

```ts
describe('yyyymmddDash', () => {
  it('pads single-digit months and days with dashes', () => {
    expect(yyyymmddDash(new Date(2026, 7, 3))).toBe('2026-08-03')
  })
})
```

그리고 파일 상단 import 목록에 `yyyymmddDash`를 추가:

```ts
import {
  addDays,
  dateFromYmd,
  dayName,
  lastDayOfMonth,
  mondayOf,
  schoolYearOf,
  semesterOf,
  weekdaysOf,
  yyyymm,
  yyyymmdd,
  yyyymmddDash,
} from './date-utils'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- date-utils`
Expected: FAIL — `yyyymmddDash` is not exported / not defined.

- [ ] **Step 3: Write minimal implementation**

`src/lib/utils/date-utils.ts`의 `yyyymmdd` 함수 바로 아래에 추가:

```ts
export function yyyymmddDash(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- date-utils`
Expected: PASS, all existing date-utils tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/date-utils.ts src/lib/utils/date-utils.test.ts
git commit -m "feat: add yyyymmddDash date-utils helper for attendance queries"
```

---

## Task 2: `attendance` 테스트 목에 `lte` 체인 메서드 추가

**Files:**
- Modify: `src/test/supabaseMock.ts`

**Interfaces:**
- Consumes: 없음 (공유 테스트 유틸).
- Produces: `createQueryBuilder(...)`가 반환하는 빌더에 `.lte(...)`가 다른 체인 메서드와 동일하게 존재 — Task 4의 `useWeeklyAttendance` 테스트가 `.gte(...).lte(...)`를 체이닝하므로 필요.

이 파일은 여러 훅 테스트가 공유하므로 별도 실패 테스트 없이 바로 수정한다 (기존 `CHAIN_METHODS` 목록에 항목 하나 추가하는 것으로, Task 4에서 이 변경이 필요함이 드러난다).

- [ ] **Step 1: `CHAIN_METHODS`에 `lte` 추가**

`src/test/supabaseMock.ts`:

```ts
const CHAIN_METHODS = ['select', 'order', 'eq', 'gte', 'lt', 'lte', 'insert', 'update', 'upsert', 'delete'] as const
```

- [ ] **Step 2: 기존 테스트가 깨지지 않는지 확인**

Run: `npm test`
Expected: PASS (기존 모든 테스트 — 이 파일을 쓰는 다른 훅 테스트들이 영향받지 않아야 함).

- [ ] **Step 3: Commit**

```bash
git add src/test/supabaseMock.ts
git commit -m "test: add lte to the shared Supabase query builder mock"
```

---

## Task 3: 출결 관련 타입 추가

**Files:**
- Modify: `src/lib/types.ts`

**Interfaces:**
- Produces:
  - `AttendanceEntryWithStudent = AttendanceEntry & { students: { number: number; name: string } | null }`
  - `WeeklyAttendanceBadge = { student_id: string; number: number; name: string; status: AttendanceStatus }`
  - `WeeklyAttendanceDay = { date: string; dayLabel: string; entries: WeeklyAttendanceBadge[] }` (`date`는 `'YYYYMMDD'`, 다른 `Weekly*Day` 타입과 동일한 포맷)

이 타입들은 순수 데이터 셰이프라 테스트가 필요 없다 (TypeScript 컴파일 자체가 검증).

- [ ] **Step 1: `src/lib/types.ts`의 `AttendanceEntry` 타입 정의 바로 아래에 추가**

```ts
export type AttendanceEntryWithStudent = AttendanceEntry & {
  students: { number: number; name: string } | null
}

export type WeeklyAttendanceBadge = {
  student_id: string
  number: number
  name: string
  status: AttendanceStatus
}

/** date는 'YYYYMMDD' */
export type WeeklyAttendanceDay = {
  date: string
  dayLabel: string
  entries: WeeklyAttendanceBadge[]
}
```

- [ ] **Step 2: 타입 체크로 검증**

Run: `npm run build`
Expected: `tsc -b` 통과 (아직 아무도 이 타입을 쓰지 않으므로 에러 없이 통과해야 함).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add attendance types for the weekly home card"
```

---

## Task 4: `groupAttendanceByDate` 순수 함수

**Files:**
- Create: `src/lib/utils/weeklyAttendance.ts`
- Test: `src/lib/utils/weeklyAttendance.test.ts`

**Interfaces:**
- Consumes: `AttendanceEntryWithStudent`, `WeeklyAttendanceDay`, `AttendanceStatus` (Task 3), `dayName`/`yyyymmdd` (`src/lib/utils/date-utils.ts`, 기존).
- Produces: `groupAttendanceByDate(days: Date[], entries: AttendanceEntryWithStudent[]): WeeklyAttendanceDay[]` — Task 6(`WeeklyAttendanceCard`)이 그대로 소비.

- [ ] **Step 1: Write the failing test**

`src/lib/utils/weeklyAttendance.test.ts` 새로 작성:

```ts
import { describe, expect, it } from 'vitest'
import { groupAttendanceByDate } from './weeklyAttendance'
import type { AttendanceEntryWithStudent } from '../types'

function entry(overrides: Partial<AttendanceEntryWithStudent>): AttendanceEntryWithStudent {
  return {
    id: 'x',
    student_id: 'x',
    teacher_id: 't1',
    date: '2026-08-03',
    status: '결석',
    reason_category: '기타',
    note: null,
    created_at: '2026-08-03',
    students: { number: 1, name: '학생' },
    ...overrides,
  }
}

describe('groupAttendanceByDate', () => {
  it('sorts same-day entries by status priority, then by student number', () => {
    // Deliberately out of both status-priority and number order, so a
    // naive (unsorted) implementation would produce a different result.
    const entries: AttendanceEntryWithStudent[] = [
      entry({ id: 'a', student_id: 's5', date: '2026-08-03', status: '조퇴', students: { number: 5, name: '이five' } }),
      entry({ id: 'b', student_id: 's9', date: '2026-08-03', status: '결석', students: { number: 9, name: '박nine' } }),
      entry({ id: 'c', student_id: 's2', date: '2026-08-03', status: '지각', students: { number: 2, name: '김two' } }),
      entry({ id: 'd', student_id: 's3', date: '2026-08-03', status: '결석', students: { number: 3, name: '최three' } }),
    ]

    const days = groupAttendanceByDate([new Date(2026, 7, 3)], entries)

    expect(days).toHaveLength(1)
    expect(days[0].date).toBe('20260803')
    expect(days[0].dayLabel).toBe('월')
    expect(days[0].entries.map((e) => e.student_id)).toEqual(['s3', 's9', 's2', 's5'])
  })

  it('fills in each requested day, defaulting to no entries when missing', () => {
    const entries: AttendanceEntryWithStudent[] = [
      entry({ id: 'a', student_id: 's1', date: '2026-08-03' }),
    ]

    const days = groupAttendanceByDate([new Date(2026, 7, 3), new Date(2026, 7, 4)], entries)

    expect(days[0].entries).toHaveLength(1)
    expect(days[1].date).toBe('20260804')
    expect(days[1].entries).toEqual([])
  })

  it('ignores entries whose date falls outside the requested days', () => {
    const entries: AttendanceEntryWithStudent[] = [
      entry({ id: 'a', student_id: 's1', date: '2026-08-10' }),
    ]

    const days = groupAttendanceByDate([new Date(2026, 7, 3)], entries)

    expect(days[0].entries).toEqual([])
  })

  it('drops an entry whose joined student is null', () => {
    // Can happen if a student was deleted after the attendance row was
    // created but before this query ran (FK is on delete cascade, but a
    // stale in-flight request could still race it).
    const entries: AttendanceEntryWithStudent[] = [
      entry({ id: 'a', student_id: 's1', date: '2026-08-03', students: null }),
    ]

    const days = groupAttendanceByDate([new Date(2026, 7, 3)], entries)

    expect(days[0].entries).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- weeklyAttendance`
Expected: FAIL — `./weeklyAttendance` module not found.

- [ ] **Step 3: Write minimal implementation**

`src/lib/utils/weeklyAttendance.ts` 새로 작성:

```ts
import { dayName, yyyymmdd } from './date-utils'
import type { AttendanceEntryWithStudent, AttendanceStatus, WeeklyAttendanceDay } from '../types'

const STATUS_ORDER: AttendanceStatus[] = ['결석', '지각', '조퇴', '결과']

export function groupAttendanceByDate(
  days: Date[],
  entries: AttendanceEntryWithStudent[],
): WeeklyAttendanceDay[] {
  return days.map((d) => {
    const ds = yyyymmdd(d)
    const dayEntries = entries
      .filter((e) => e.date.replace(/-/g, '') === ds && e.students !== null)
      .map((e) => ({
        student_id: e.student_id,
        number: e.students!.number,
        name: e.students!.name,
        status: e.status,
      }))
      .sort((a, b) => {
        const statusDiff = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
        if (statusDiff !== 0) return statusDiff
        return a.number - b.number
      })
    return { date: ds, dayLabel: dayName(d), entries: dayEntries }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- weeklyAttendance`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/weeklyAttendance.ts src/lib/utils/weeklyAttendance.test.ts
git commit -m "feat: add groupAttendanceByDate for the weekly home attendance card"
```

---

## Task 5: `useWeeklyAttendance` 훅

**Files:**
- Create: `src/lib/hooks/useWeeklyAttendance.ts`
- Test: `src/lib/hooks/useWeeklyAttendance.test.ts`

**Interfaces:**
- Consumes: `supabase` (`src/lib/supabaseClient.ts`), `yyyymmddDash` (Task 1), `AttendanceEntryWithStudent` (Task 3).
- Produces: `useWeeklyAttendance(weekStart: Date, weekEnd: Date, refreshToken: number): { data: AttendanceEntryWithStudent[]; loading: boolean; error: string | null; refetch: () => Promise<void> }` — Task 7(`WeeklyAttendanceCard`)이 그대로 소비.

- [ ] **Step 1: Write the failing test**

`src/lib/hooks/useWeeklyAttendance.test.ts` 새로 작성:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createQueryBuilder } from '../../test/supabaseMock'

const mockFrom = vi.fn()

vi.mock('../supabaseClient', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}))

const { useWeeklyAttendance } = await import('./useWeeklyAttendance')

beforeEach(() => {
  mockFrom.mockReset()
})

describe('useWeeklyAttendance', () => {
  it('queries attendance joined with students, filtered to the given date range', async () => {
    const builder = createQueryBuilder({ data: [], error: null })
    mockFrom.mockReturnValue(builder)

    const weekStart = new Date(2026, 7, 3) // Monday 2026-08-03
    const weekEnd = new Date(2026, 7, 7) // Friday 2026-08-07
    const { result } = renderHook(() => useWeeklyAttendance(weekStart, weekEnd, 0))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockFrom).toHaveBeenCalledWith('attendance')
    expect(builder.select).toHaveBeenCalledWith('*, students(number, name)')
    expect(builder.gte).toHaveBeenCalledWith('date', '2026-08-03')
    expect(builder.lte).toHaveBeenCalledWith('date', '2026-08-07')
  })

  it('returns the joined rows on success', async () => {
    const row = {
      id: 'a1',
      student_id: 's1',
      teacher_id: 't1',
      date: '2026-08-05',
      status: '결석' as const,
      reason_category: '질병' as const,
      note: null,
      created_at: '2026-08-05',
      students: { number: 3, name: '김민준' },
    }
    mockFrom.mockReturnValue(createQueryBuilder({ data: [row], error: null }))

    const { result } = renderHook(() => useWeeklyAttendance(new Date(2026, 7, 3), new Date(2026, 7, 7), 0))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toEqual([row])
    expect(result.current.error).toBeNull()
  })

  it('surfaces the error message when the query fails', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: { message: '네트워크 오류' } }))

    const { result } = renderHook(() => useWeeklyAttendance(new Date(2026, 7, 3), new Date(2026, 7, 7), 0))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('네트워크 오류')
    expect(result.current.data).toEqual([])
  })

  it('refetches when refreshToken changes', async () => {
    const builder = createQueryBuilder({ data: [], error: null })
    mockFrom.mockReturnValue(builder)

    const weekStart = new Date(2026, 7, 3)
    const weekEnd = new Date(2026, 7, 7)
    const { rerender } = renderHook(({ token }) => useWeeklyAttendance(weekStart, weekEnd, token), {
      initialProps: { token: 0 },
    })

    await waitFor(() => expect(mockFrom).toHaveBeenCalledTimes(1))

    rerender({ token: 1 })

    await waitFor(() => expect(mockFrom).toHaveBeenCalledTimes(2))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useWeeklyAttendance`
Expected: FAIL — `./useWeeklyAttendance` module not found.

- [ ] **Step 3: Write minimal implementation**

`src/lib/hooks/useWeeklyAttendance.ts` 새로 작성:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { yyyymmddDash } from '../utils/date-utils'
import type { AttendanceEntryWithStudent } from '../types'

export function useWeeklyAttendance(weekStart: Date, weekEnd: Date, refreshToken: number) {
  const [data, setData] = useState<AttendanceEntryWithStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('attendance')
      .select('*, students(number, name)')
      .gte('date', yyyymmddDash(weekStart))
      .lte('date', yyyymmddDash(weekEnd))

    if (error) {
      setError(error.message)
    } else {
      setData((data ?? []) as AttendanceEntryWithStudent[])
    }
    setLoading(false)
  }, [weekStart, weekEnd])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries, refreshToken])

  return { data, loading, error, refetch: fetchEntries }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useWeeklyAttendance`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/hooks/useWeeklyAttendance.ts src/lib/hooks/useWeeklyAttendance.test.ts
git commit -m "feat: add useWeeklyAttendance hook for the home attendance card"
```

---

## Task 6: `WeeklyAttendanceCard` 컴포넌트

**Files:**
- Create: `src/components/home/WeeklyAttendanceCard.tsx`

**Interfaces:**
- Consumes: `useWeeklyAttendance` (Task 5), `groupAttendanceByDate` (Task 4), `weekdaysOf`/`yyyymmdd` (`src/lib/utils/date-utils.ts`, 기존), `ATTENDANCE_STATUS_COLOR_CLASS` (`src/lib/utils/attendanceStatusColors.ts`, 기존), `LoadingState`/`ErrorState`/`EmptyState` (`src/components/home/HomeCardStates.tsx`, 기존).
- Produces: `WeeklyAttendanceCard` 컴포넌트, props `{ weekStart: Date; refreshToken: number; isCurrentWeek: boolean; onLoadingChange?: (loading: boolean) => void }` — Task 7(`HomePage`)이 그대로 사용.

`AGENTS.md` 컨벤션에 따라 이 컴포넌트는 별도 테스트를 만들지 않는다 (`npm run build` + `npm run lint` + 브라우저 스모크로 검증, Task 8).

- [ ] **Step 1: 컴포넌트 작성**

`src/components/home/WeeklyAttendanceCard.tsx` 새로 작성:

```tsx
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useWeeklyAttendance } from '../../lib/hooks/useWeeklyAttendance'
import { groupAttendanceByDate } from '../../lib/utils/weeklyAttendance'
import { weekdaysOf, yyyymmdd } from '../../lib/utils/date-utils'
import { ATTENDANCE_STATUS_COLOR_CLASS } from '../../lib/utils/attendanceStatusColors'
import { EmptyState, ErrorState, LoadingState } from './HomeCardStates'

type WeeklyAttendanceCardProps = {
  weekStart: Date
  refreshToken: number
  isCurrentWeek: boolean
  onLoadingChange?: (loading: boolean) => void
}

function formatDayDate(dateStr: string) {
  return `${Number(dateStr.slice(4, 6))}/${Number(dateStr.slice(6, 8))}`
}

export function WeeklyAttendanceCard({
  weekStart,
  refreshToken,
  isCurrentWeek,
  onLoadingChange,
}: WeeklyAttendanceCardProps) {
  const weekdays = useMemo(() => weekdaysOf(weekStart), [weekStart])
  const { data, loading, error, refetch } = useWeeklyAttendance(weekdays[0], weekdays[4], refreshToken)
  const todayStr = yyyymmdd(new Date())

  useEffect(() => {
    onLoadingChange?.(loading)
  }, [loading, onLoadingChange])

  const days = useMemo(() => groupAttendanceByDate(weekdays, data), [weekdays, data])
  const isEmpty = days.every((d) => d.entries.length === 0)

  return (
    <section className="min-w-0 rounded-[14px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-900">
        주간 출결
        {isCurrentWeek && (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">이번 주</span>
        )}
      </h2>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : isEmpty ? (
        <EmptyState message="이번 주 출결 특이사항이 없습니다." />
      ) : (
        <div className="min-w-0 overflow-x-auto">
          <div className="grid min-w-[480px] grid-cols-5 gap-2 lg:min-w-0">
            {days.map((day) => {
              const isToday = day.date === todayStr
              return (
                <div
                  key={day.date}
                  className={`box-border min-w-0 rounded-lg border p-2.5 ${
                    isToday ? 'border-2 border-brand-500 bg-brand-50/40' : 'border border-gray-200'
                  }`}
                >
                  <div className="mb-2 text-center">
                    <div className={`text-xs font-semibold ${isToday ? 'text-brand-700' : 'text-gray-700'}`}>
                      {day.dayLabel}
                    </div>
                    <div className="text-[11px] text-gray-400">{formatDayDate(day.date)}</div>
                    {isToday && <div className="mt-0.5 text-[10px] font-medium text-brand-500">오늘</div>}
                  </div>

                  {day.entries.length === 0 ? (
                    <p className="text-center text-xs text-gray-400">—</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {day.entries.map((entry) => (
                        <li key={entry.student_id}>
                          <Link
                            to={`/students/${entry.student_id}`}
                            className={`block rounded px-1.5 py-1 text-center text-[11px] font-medium ${ATTENDANCE_STATUS_COLOR_CLASS[entry.status]}`}
                          >
                            {entry.number}번 {entry.name} {entry.status}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: 타입/린트 확인**

Run: `npm run build && npm run lint`
Expected: 둘 다 에러 없이 통과 (아직 `HomePage`에서 쓰이지 않으므로 미사용 export 경고는 없음 — named export라 oxlint의 no-unused-vars 대상이 아님).

- [ ] **Step 3: Commit**

```bash
git add src/components/home/WeeklyAttendanceCard.tsx
git commit -m "feat: add WeeklyAttendanceCard component"
```

---

## Task 7: `HomePage`에 카드 배치

**Files:**
- Modify: `src/routes/HomePage.tsx`

**Interfaces:**
- Consumes: `WeeklyAttendanceCard` (Task 6).

- [ ] **Step 1: import 추가**

`src/routes/HomePage.tsx` 상단, 기존 `import { WeeklyMealCard } from '../components/home/WeeklyMealCard'` 바로 아래에 추가:

```ts
import { WeeklyAttendanceCard } from '../components/home/WeeklyAttendanceCard'
```

- [ ] **Step 2: 로딩 상태 통합**

기존:

```ts
const [timetableLoading, setTimetableLoading] = useState(false)
const [mealLoading, setMealLoading] = useState(false)
```

다음으로 교체:

```ts
const [timetableLoading, setTimetableLoading] = useState(false)
const [mealLoading, setMealLoading] = useState(false)
const [attendanceLoading, setAttendanceLoading] = useState(false)
```

그리고 기존:

```ts
const isRefreshing = timetableLoading || mealLoading
```

다음으로 교체:

```ts
const isRefreshing = timetableLoading || mealLoading || attendanceLoading
```

- [ ] **Step 3: 카드 배치**

기존 그리드 블록:

```tsx
<div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,42fr)_minmax(0,58fr)]">
  <WeeklyTimetableCard
    settings={settings}
    weekStart={weekStart}
    refreshToken={refreshToken}
    isCurrentWeek={isCurrentWeek}
    onLoadingChange={setTimetableLoading}
  />
  <WeeklyMealCard
    settings={settings}
    weekStart={weekStart}
    refreshToken={refreshToken}
    isCurrentWeek={isCurrentWeek}
    onLoadingChange={setMealLoading}
  />
</div>
```

다음으로 교체 (그리드 뒤에 전체 폭 카드를 형제 요소로 추가):

```tsx
<div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,42fr)_minmax(0,58fr)]">
  <WeeklyTimetableCard
    settings={settings}
    weekStart={weekStart}
    refreshToken={refreshToken}
    isCurrentWeek={isCurrentWeek}
    onLoadingChange={setTimetableLoading}
  />
  <WeeklyMealCard
    settings={settings}
    weekStart={weekStart}
    refreshToken={refreshToken}
    isCurrentWeek={isCurrentWeek}
    onLoadingChange={setMealLoading}
  />
</div>

<div className="mt-5">
  <WeeklyAttendanceCard
    weekStart={weekStart}
    refreshToken={refreshToken}
    isCurrentWeek={isCurrentWeek}
    onLoadingChange={setAttendanceLoading}
  />
</div>
```

- [ ] **Step 4: 타입/린트 확인**

Run: `npm run build && npm run lint`
Expected: 둘 다 에러 없이 통과.

- [ ] **Step 5: Commit**

```bash
git add src/routes/HomePage.tsx
git commit -m "feat: show the weekly attendance card on the home page"
```

---

## Task 8: 전체 검증 + 브라우저 스모크 테스트

**Files:** 없음 (검증 전용 태스크).

- [ ] **Step 1: 전체 테스트 스위트 실행**

Run: `npm test`
Expected: 모든 테스트 통과 (신규 12개 이상 + 기존 전부).

- [ ] **Step 2: 빌드 + 린트**

Run: `npm run build && npm run lint`
Expected: 둘 다 에러 없이 통과 (기존에 있던 무관한 warning은 그대로 있어도 됨 — `useSchoolSettings.test.ts`/`useSeatingPlans.test.ts`의 unused-vars, `SeatingPage.tsx`의 exhaustive-deps).

- [ ] **Step 3: 브라우저로 실제 동작 확인**

1. `npm run dev` (또는 이미 떠 있는 dev 서버 사용).
2. 로그인 후 홈(`/home`)으로 이동.
3. 출결관리(`/attendance`)에서 이번 주 평일 중 하루에 학생 2명 이상의 출결(서로 다른 상태 포함)을 입력.
4. 홈으로 돌아와 새로고침 버튼 클릭 — 새 "주간 출결" 카드가 시간표/식단표 카드 아래 전체 폭으로 나타나는지 확인.
5. 입력한 날짜 칸에 학생 배지가 상태별 색상(결석=빨강, 지각=주황, 조퇴=보라, 결과=청록)으로, 상태 우선순위→번호순으로 나열되는지 확인.
6. 배지를 클릭해 `/students/:id`(해당 학생 상세)로 이동하는지 확인.
7. 출결 입력이 없는 요일 칸에 `—`가 표시되는지 확인.
8. 이전 주로 이동해 출결 입력이 전혀 없는 주를 확인 — "이번 주 출결 특이사항이 없습니다" EmptyState가 뜨는지 확인.
9. 이전 주/다음 주/오늘 버튼 및 새로고침 버튼이 시간표·식단표 카드와 함께 이 카드도 갱신하는지 확인.

문제 발견 시 해당 Task로 돌아가 수정 후 이 Task를 다시 수행한다.

- [ ] **Step 4: 최종 커밋 (필요 시)**

스모크 테스트 중 수정 사항이 있었다면:

```bash
git add -A
git commit -m "fix: address issues found in home attendance card smoke test"
```

수정 사항이 없었다면 이 스텝은 건너뛴다.
