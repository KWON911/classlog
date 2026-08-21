# 누가기록 학생 카드 기록건수 배지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학급기록(`/students`) 페이지의 "누가기록" 탭 학생 카드 각각에, 그 학생의 생활기록(`records`) 건수를 작은 배지로 표시한다.

**Architecture:** 신규 경량 집계 훅 `useRecordCounts`가 `records` 테이블에서 `student_id` 컬럼만 조회(전체 행이 아니라 한 컬럼만 — 배지는 개수만 필요하고 내용은 필요 없다)해 클라이언트에서 학생별 개수를 세고, `Map<string, number>`(학생 id → 건수)로 돌려준다. `StudentListItem`에 선택적 `recordCount` prop을 추가해 값이 있을 때만 배지를 그린다. `StudentListPage`가 이 훅을 호출해 각 카드에 값을 내려준다.

**Tech Stack:** React 19 + TypeScript, Supabase, Tailwind CSS v4 (신규 의존성 없음)

## Global Constraints

- 데이터 접근은 훅 전용(hook-only) 원칙을 지킨다 — `supabase`는 `src/lib/hooks/useRecordCounts.ts` 안에서만 import한다.
- 이 훅은 최근 추가된 `useAllRecords`(내보내기 버튼 전용, 지연 조회, 전체 컬럼 조회)와 의도적으로 다르다 — `useRecordCounts`는 배지가 페이지 진입 시 항상 보여야 하므로 이 코드베이스의 다른 테이블 훅들(`useStudents` 등)과 동일하게 **마운트 시 자동으로 fetch**한다. `useAllRecords`를 재사용하거나 그 지연(lazy) 패턴을 따라가지 않는다 — 배지 표시에 필요한 것은 `student_id` 하나뿐이라 전체 레코드(내용 포함)를 불러오는 것은 낭비다.
- `records` 테이블 전체 행 수가 Supabase PostgREST 기본 조회 제한(1000행)을 넘을 수 있으므로, `useAllRecords`가 이미 쓰고 있는 것과 동일한 `.range()` 기반 페이지네이션 루프를 그대로 재사용해 전량을 정확히 집계한다(한 페이지만 조회하면 전체 건수가 아니라 앞부분만 집계되는 결함이 생긴다).
- 배지는 집계가 아직 로딩 중이거나 실패했을 때는 그리지 않는다(`recordCount`가 `undefined`) — 로딩 중에 "0건"이 잠깐 보였다가 실제 값으로 바뀌는 깜빡임을 피하기 위함이다. 이 프로젝트에서 최근 실제로 발생했던 "로딩 중에 빈 상태가 잘못 보이는" 버그와 같은 종류의 문제를 사전에 피하는 것이므로, 리뷰에서 "왜 로딩 상태에서도 0건을 안 보여주냐"는 지적이 나와도 결함이 아니라 의도된 설계다.
- 집계 실패 시 별도의 에러 배너는 띄우지 않는다 — 배지는 로스터를 훑어보는 데 도움을 주는 부가 정보이지 필수 기능이 아니며, 실패해도 카드 목록 자체는 정상 작동해야 한다(배지만 안 보이면 된다).
- `src/components/StudentListItem.tsx`, `src/routes/StudentListPage.tsx`는 컴포넌트/라우트라 이 프로젝트의 자동화 테스트 대상이 아니다 — `npm run build` + `npm run lint` + 수동 스모크로 검증한다. `src/lib/hooks/useRecordCounts.ts`는 훅이라 자동화 테스트 대상이다.
- 테스트에서 집계(그룹 카운트) 로직을 검증할 땐, "행 개수를 그대로 리턴"하거나 "학생마다 항상 1"처럼 잘못된 구현도 우연히 통과하지 않는 픽스처를 쓴다 — 같은 학생에게 기록이 여러 개, 다른 학생에게 다른 개수가 있는 데이터로 실제 그룹핑이 일어나는지 검증한다.

---

### Task 1: `useRecordCounts` — 학생별 생활기록 건수 집계 훅

**Files:**
- Create: `src/lib/hooks/useRecordCounts.ts`
- Test: `src/lib/hooks/useRecordCounts.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `useRecordCounts(): { counts: Map<string, number>, loading: boolean, error: string | null, refetch: () => Promise<void> }` — Task 2가 `counts.get(student.id)`로 학생별 건수를 조회해 `StudentListItem`에 넘긴다.

- [ ] **Step 1: 훅 구현**

`src/lib/hooks/useRecordCounts.ts` 새로 생성:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const RECORD_COUNTS_PAGE_SIZE = 1000

/** 학급기록의 "누가기록" 학생 카드에 학생별 생활기록 건수 배지를 표시하기
 *  위한 집계 훅. records 테이블의 모든 컬럼이 아니라 student_id 하나만
 *  조회해 가볍게 유지하고, 클라이언트에서 학생별로 개수를 센다.
 *  useAllRecords(내보내기 버튼 전용, 지연 조회, 전체 컬럼)와 달리 이 훅은
 *  카드가 항상 배지를 보여줘야 하므로 마운트 시 자동으로 조회한다.
 *  records 테이블이 Supabase 기본 조회 제한(1000행)을 넘을 수 있으므로
 *  useAllRecords와 동일한 방식으로 페이지네이션한다. */
export function useRecordCounts() {
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCounts = useCallback(async () => {
    setLoading(true)
    setError(null)

    const tally = new Map<string, number>()
    let from = 0

    while (true) {
      const { data, error } = await supabase
        .from('records')
        .select('student_id')
        .range(from, from + RECORD_COUNTS_PAGE_SIZE - 1)

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const rows = (data ?? []) as { student_id: string }[]
      for (const row of rows) {
        tally.set(row.student_id, (tally.get(row.student_id) ?? 0) + 1)
      }

      if (rows.length < RECORD_COUNTS_PAGE_SIZE) break
      from += RECORD_COUNTS_PAGE_SIZE
    }

    setCounts(tally)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  return { counts, loading, error, refetch: fetchCounts }
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/lib/hooks/useRecordCounts.test.ts` 새로 생성:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createQueryBuilder } from '../../test/supabaseMock'

const mockFrom = vi.fn()

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

const { useRecordCounts } = await import('./useRecordCounts')

beforeEach(() => {
  mockFrom.mockReset()
})

describe('useRecordCounts', () => {
  it('fetches on mount and groups counts by student_id', async () => {
    const rows = [
      { student_id: 's-1' },
      { student_id: 's-2' },
      { student_id: 's-1' },
      { student_id: 's-1' },
    ]
    const builder = createQueryBuilder({ data: rows, error: null })
    mockFrom.mockReturnValue(builder)

    const { result } = renderHook(() => useRecordCounts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockFrom).toHaveBeenCalledWith('records')
    expect(builder.select).toHaveBeenCalledWith('student_id')
    expect(result.current.counts.get('s-1')).toBe(3)
    expect(result.current.counts.get('s-2')).toBe(1)
    expect(result.current.counts.get('s-missing')).toBeUndefined()
    expect(result.current.error).toBe(null)
  })

  it('pages through more than one page of results and accumulates counts across pages', async () => {
    const page1 = Array.from({ length: 1000 }, () => ({ student_id: 's-1' }))
    const page2 = [{ student_id: 's-1' }, { student_id: 's-2' }]
    const builder1 = createQueryBuilder({ data: page1, error: null })
    const builder2 = createQueryBuilder({ data: page2, error: null })
    mockFrom.mockReturnValueOnce(builder1).mockReturnValueOnce(builder2)

    const { result } = renderHook(() => useRecordCounts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(builder1.range).toHaveBeenCalledWith(0, 999)
    expect(builder2.range).toHaveBeenCalledWith(1000, 1999)
    expect(result.current.counts.get('s-1')).toBe(1001)
    expect(result.current.counts.get('s-2')).toBe(1)
  })

  it('surfaces the error message when fetch fails', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: '네트워크 오류' } })
    mockFrom.mockReturnValue(builder)

    const { result } = renderHook(() => useRecordCounts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('네트워크 오류')
    expect(result.current.counts.size).toBe(0)
  })
})
```

(첫 번째 테스트의 픽스처는 `s-1`이 3건, `s-2`가 1건으로 서로 다르게 섞여 있다 — "행 개수를 그대로 리턴"하거나 "학생마다 항상 1"처럼 잘못된 집계 구현이 있었다면 이 테스트가 실패한다.)

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- useRecordCounts`
Expected: FAIL — `useRecordCounts.ts` 파일이 아직 없어 import 에러

- [ ] **Step 4: 테스트 통과 확인**

Step 1을 이미 적용했다면 이 시점에 통과해야 한다.

Run: `npm test -- useRecordCounts`
Expected: PASS (3개 테스트 모두)

- [ ] **Step 5: 빌드·린트 확인**

Run: `npm run build && npm run lint`
Expected: 둘 다 통과

- [ ] **Step 6: 커밋**

```bash
git add src/lib/hooks/useRecordCounts.ts src/lib/hooks/useRecordCounts.test.ts
git commit -m "feat: add useRecordCounts hook for per-student record count badges"
```

---

### Task 2: `StudentListItem` 배지 렌더링 + `StudentListPage` 연결

**Files:**
- Modify: `src/components/StudentListItem.tsx`
- Modify: `src/routes/StudentListPage.tsx`

**Interfaces:**
- Consumes: `useRecordCounts()` → `{ counts, loading }` (Task 1)
- Produces: 없음 (컴포넌트/라우트, 이 파일들을 소비하는 다른 코드 없음)

- [ ] **Step 1: `StudentListItem`에 선택적 `recordCount` prop과 배지 추가**

`src/components/StudentListItem.tsx` 현재 전체 내용:

```tsx
import { Link } from 'react-router-dom'
import type { Student } from '../lib/types'

export function StudentListItem({ student }: { student: Student }) {
  return (
    <Link
      to={`/students/${student.id}`}
      title={student.name}
      aria-label={`${student.number}번 ${student.name} 학생 기록 보기`}
      className="flex h-[60px] min-w-0 items-center gap-2.5 rounded-[10px] border border-gray-200 bg-white px-4 transition-colors hover:border-brand-200 hover:bg-brand-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-1 active:border-brand-300 active:bg-brand-50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
        {student.number}
      </span>
      <span className="min-w-0 truncate text-base font-semibold text-gray-900">{student.name}</span>
    </Link>
  )
}
```

다음으로 전체 교체:

```tsx
import { Link } from 'react-router-dom'
import type { Student } from '../lib/types'

type StudentListItemProps = {
  student: Student
  /** undefined면 배지를 그리지 않는다 — 집계가 아직 로딩 중이거나 실패한
   *  상태에서 "0건"이 잘못 보였다가 실제 값으로 바뀌는 깜빡임을 피한다. */
  recordCount?: number
}

export function StudentListItem({ student, recordCount }: StudentListItemProps) {
  return (
    <Link
      to={`/students/${student.id}`}
      title={student.name}
      aria-label={`${student.number}번 ${student.name} 학생 기록 보기`}
      className="flex h-[60px] min-w-0 items-center gap-2.5 rounded-[10px] border border-gray-200 bg-white px-4 transition-colors hover:border-brand-200 hover:bg-brand-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-1 active:border-brand-300 active:bg-brand-50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
        {student.number}
      </span>
      <span className="min-w-0 truncate text-base font-semibold text-gray-900">{student.name}</span>
      {typeof recordCount === 'number' && (
        <span className="ml-auto shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
          {recordCount}건
        </span>
      )}
    </Link>
  )
}
```

- [ ] **Step 2: `StudentListPage`에서 훅 호출 후 카드에 건수 전달**

`src/routes/StudentListPage.tsx`의 import 블록 현재:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { useStudents } from '../lib/hooks/useStudents'
import { useAllRecords } from '../lib/hooks/useAllRecords'
import { StudentListItem } from '../components/StudentListItem'
import { PageContainer } from '../components/PageContainer'
import { YorokTable } from '../components/yorok/YorokTable'
import { buildRecordsCsv } from '../lib/csv'
import { yyyymmdd } from '../lib/utils/date-utils'
import { csvButtonClass, secondaryButtonClass } from '../lib/ui/classNames'
```

다음으로 변경(한 줄 추가):

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { useStudents } from '../lib/hooks/useStudents'
import { useAllRecords } from '../lib/hooks/useAllRecords'
import { useRecordCounts } from '../lib/hooks/useRecordCounts'
import { StudentListItem } from '../components/StudentListItem'
import { PageContainer } from '../components/PageContainer'
import { YorokTable } from '../components/yorok/YorokTable'
import { buildRecordsCsv } from '../lib/csv'
import { yyyymmdd } from '../lib/utils/date-utils'
import { csvButtonClass, secondaryButtonClass } from '../lib/ui/classNames'
```

함수 본문 현재:

```tsx
export function StudentListPage() {
  const { students, loading, error, refetch } = useStudents()
  const [activeTab, setActiveTab] = useState<Tab>('yorok')
  const { fetchAllRecords, loading: exportingRecords } = useAllRecords()
  const [exportError, setExportError] = useState<string | null>(null)
```

다음으로 변경(한 줄 추가):

```tsx
export function StudentListPage() {
  const { students, loading, error, refetch } = useStudents()
  const [activeTab, setActiveTab] = useState<Tab>('yorok')
  const { fetchAllRecords, loading: exportingRecords } = useAllRecords()
  const [exportError, setExportError] = useState<string | null>(null)
  const { counts: recordCounts, loading: countsLoading } = useRecordCounts()
```

학생 카드를 렌더링하는 부분 현재:

```tsx
          {!loading && !error && students.length > 0 && (
            <div className={GRID_CLASS}>
              {students.map((student) => (
                <StudentListItem key={student.id} student={student} />
              ))}
            </div>
          )}
```

다음으로 변경:

```tsx
          {!loading && !error && students.length > 0 && (
            <div className={GRID_CLASS}>
              {students.map((student) => (
                <StudentListItem
                  key={student.id}
                  student={student}
                  recordCount={countsLoading ? undefined : recordCounts.get(student.id) ?? 0}
                />
              ))}
            </div>
          )}
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 타입 에러 없이 성공

- [ ] **Step 4: 린트 확인**

Run: `npm run lint`
Expected: 통과

- [ ] **Step 5: 전체 테스트 확인**

Run: `npm test`
Expected: 기존 테스트 + Task 1에서 추가한 테스트 전부 통과 (컴포넌트/라우트는 자동화 테스트 대상이 아니므로 회귀 확인 목적)

- [ ] **Step 6: 수동 브라우저 확인**

`npm run dev`로 로그인 후 `/students` → "누가기록" 탭에서:
- 생활기록이 있는 학생 카드 오른쪽에 "N건" 배지가 뜨는지 확인 (실제 등록된 기록 개수와 일치하는지)
- 생활기록이 전혀 없는 학생 카드에는 "0건" 배지가 뜨는지 확인
- 페이지를 새로고침한 직후, 배지가 "0건"으로 잘못 표시됐다가 실제 값으로 바뀌는 깜빡임 없이 곧바로 올바른 값(또는 로딩 완료 전까지는 배지 없음)으로 나타나는지 확인
- "학급요록" 탭으로 전환해도 페이지가 정상 동작하는지(배지 관련 에러 없이) 확인
- 학생 상세 페이지에서 기록을 하나 추가한 뒤 "학급기록" 목록으로 돌아와서(페이지 재진입) 배지 숫자가 갱신되는지 확인

- [ ] **Step 7: 커밋**

```bash
git add src/components/StudentListItem.tsx src/routes/StudentListPage.tsx
git commit -m "feat: show per-student record count badges on the roster tab"
```

## 영향받는 파일

- `src/lib/hooks/useRecordCounts.ts` (신규) — 학생별 생활기록 건수 집계 훅.
- `src/lib/hooks/useRecordCounts.test.ts` (신규) — 훅 테스트 3건.
- `src/components/StudentListItem.tsx` — 선택적 `recordCount` prop과 배지 렌더링 추가.
- `src/routes/StudentListPage.tsx` — `useRecordCounts` 호출 및 카드별 건수 전달.

배포에 별도 조치 불필요 — 신규 테이블/컬럼 없음, `records` 테이블은 이미 존재하며 RLS 정책도 이미 적용되어 있음.
