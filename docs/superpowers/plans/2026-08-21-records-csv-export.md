# 전체 학생 생활기록 CSV 내보내기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학급기록(`/students`) 페이지의 "누가기록" 탭에 버튼을 하나 추가해, 반 전체 학생의 생활기록(`records` 테이블 전체)을 한 번에 CSV 파일로 내보낸다 — 학년말 행동발달상황 작성 등에 참고 자료로 쓰기 위함.

**Architecture:** 신규 지연(lazy) 훅 `useAllRecords`가 버튼 클릭 시점에만 `records` 테이블 전체를 조회하고(RLS가 이미 교사 범위로 제한), 신규 순수 함수 `buildRecordsCsv`(`src/lib/csv.ts`)가 학생 번호 → 기록 날짜 순으로 정렬한 CSV 문자열을 만들며, `StudentListPage.tsx`가 이 둘을 엮어 기존 `StudentListCard.tsx`의 CSV 내보내기 버튼과 동일한 Blob-다운로드 방식으로 파일을 내려받게 한다. 파일 형식은 CSV(사용자 확정) — 이 앱에 이미 있는 학생명단 CSV 내보내기와 동일한 관례를 그대로 따른다.

**Tech Stack:** React 19 + TypeScript, Supabase, Tailwind CSS v4 (신규 의존성 없음 — CSV는 이 앱의 기존 학생명단 내보내기와 동일하게 브라우저 Blob 다운로드로 구현)

## Global Constraints

- 신규 라이브러리(xlsx 등)를 추가하지 않는다 — 사용자가 CSV 형식을 명시적으로 선택했다.
- 데이터 접근은 훅 전용(hook-only) 원칙을 지킨다 — `supabase`는 `src/lib/hooks/useAllRecords.ts` 안에서만 import한다. `StudentListPage.tsx`는 훅을 통해서만 데이터를 받는다.
- `src/lib/csv.ts`는 React/Supabase를 import하지 않는 순수 모듈 관례를 유지한다 — 이 파일의 다른 함수들과 마찬가지로 `type { ... } from './types'` 타입 전용 import만 허용된다(런타임 의존성 아님).
- CSV 내보낸 파일이 Excel(한글 Windows)에서 깨지지 않도록, 기존 `StudentListCard.tsx`의 `handleExportCsv`와 동일하게 UTF-8 BOM(`'﻿' + csv`)을 앞에 붙여 Blob을 만든다.
- 정렬은 학생 번호 오름차순, 같은 학생 안에서는 기록 날짜 오름차순(과거→최근)이다 — 목록 화면(`RecordTimeline`)의 "최신순" 정렬과 의도적으로 반대 방향이다(한 해 동안의 흐름을 순서대로 읽기 위함이므로, 리뷰에서 "RecordTimeline과 정렬 방향이 다르다"는 지적이 나와도 결함이 아니라 의도된 설계다).
- `src/lib/csv.ts`, `src/lib/hooks/useAllRecords.ts`는 이 프로젝트에서 자동화 테스트 대상이다(순수 로직 + 훅). `src/routes/StudentListPage.tsx`는 라우트라 자동화 테스트 대상이 아니다 — `npm run build` + `npm run lint` + 수동 스모크로 검증한다.
- 테스트에서 정렬 순서를 검증할 땐, 입력 배열을 이미 정렬된 순서로 넣지 않는다 — 정렬 로직이 없어도 우연히 통과하는 픽스처는 금지(이 저장소에서 과거 두 번 발생한 버그 패턴).

---

### Task 1: `buildRecordsCsv` — 생활기록 CSV 문자열 생성

**Files:**
- Modify: `src/lib/csv.ts` (파일 맨 위에 타입 import 추가, `buildStudentsCsv` 아래에 새 함수 추가)
- Test: `src/lib/csv.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `buildRecordsCsv(records: StudentRecord[], students: RecordExportStudent[]): string`, `RecordExportStudent = Pick<Student, 'id' | 'number' | 'name'>` — Task 3이 이 시그니처로 호출한다.

- [ ] **Step 1: 파일 맨 위에 타입 import 추가**

`src/lib/csv.ts`의 첫 줄(현재 `function parseCsvLine(line: string): string[] {`) 바로 위에 추가:

```ts
import type { Student, StudentRecord } from './types'
```

- [ ] **Step 2: `buildRecordsCsv` 함수를 `buildStudentsCsv` 바로 뒤에 추가**

`src/lib/csv.ts`의 `buildStudentsCsv` 함수(현재 96-118행) 바로 다음, `parseStudentsCsv` 함수 시작 전에 추가:

```ts
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
```

(`escapeCsvField`는 이 파일에 이미 정의되어 있는 모듈-내부 함수를 그대로 재사용한다 — 새로 만들지 않는다.)

- [ ] **Step 3: 실패하는 테스트 작성**

`src/lib/csv.test.ts`의 최상단 import를 다음으로 교체:

```ts
import { describe, expect, it } from 'vitest'
import { buildRecordsCsv, buildStudentsCsv, decodeCsvBytes, parseStudentsCsv } from './csv'
import type { StudentRecord } from './types'
```

파일 끝에 다음 테스트 블록을 추가:

```ts
describe('buildRecordsCsv', () => {
  const studentA = { id: 's-1', number: 3, name: '김민준' }
  const studentB = { id: 's-2', number: 1, name: '이서연' }

  it('sorts by student number ascending, then by record date ascending within a student', () => {
    const records: StudentRecord[] = [
      {
        id: 'r1',
        student_id: 's-1',
        teacher_id: 't1',
        category: '학습',
        content: '나중 기록',
        record_date: '2026-06-01',
        created_at: '2026-06-01T00:00:00Z',
      },
      {
        id: 'r2',
        student_id: 's-2',
        teacher_id: 't1',
        category: '생활지도',
        content: 'B학생 기록',
        record_date: '2026-03-01',
        created_at: '2026-03-01T00:00:00Z',
      },
      {
        id: 'r3',
        student_id: 's-1',
        teacher_id: 't1',
        category: '진로',
        content: '먼저 기록',
        record_date: '2026-01-01',
        created_at: '2026-01-01T00:00:00Z',
      },
    ]

    const csv = buildRecordsCsv(records, [studentA, studentB])

    expect(csv).toBe(
      [
        '번호,이름,날짜,구분,내용',
        '1,이서연,2026-03-01,생활지도,B학생 기록',
        '3,김민준,2026-01-01,진로,먼저 기록',
        '3,김민준,2026-06-01,학습,나중 기록',
      ].join('\r\n'),
    )
  })

  it('escapes commas, quotes, and newlines in record content', () => {
    const records: StudentRecord[] = [
      {
        id: 'r1',
        student_id: 's-1',
        teacher_id: 't1',
        category: '기타',
        content: '문장, 안에 "인용구"와\n줄바꿈이 있음',
        record_date: '2026-01-01',
        created_at: '2026-01-01T00:00:00Z',
      },
    ]

    const csv = buildRecordsCsv(records, [studentA])

    expect(csv).toBe(
      ['번호,이름,날짜,구분,내용', '3,김민준,2026-01-01,기타,"문장, 안에 ""인용구""와\n줄바꿈이 있음"'].join('\r\n'),
    )
  })

  it('skips records whose student_id is not in the given students list', () => {
    const records: StudentRecord[] = [
      {
        id: 'r1',
        student_id: 's-1',
        teacher_id: 't1',
        category: '학습',
        content: '유효 기록',
        record_date: '2026-01-01',
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'r2',
        student_id: 's-missing',
        teacher_id: 't1',
        category: '학습',
        content: '고아 기록',
        record_date: '2026-01-01',
        created_at: '2026-01-01T00:00:00Z',
      },
    ]

    const csv = buildRecordsCsv(records, [studentA])

    expect(csv).toBe(['번호,이름,날짜,구분,내용', '3,김민준,2026-01-01,학습,유효 기록'].join('\r\n'))
  })
})
```

- [ ] **Step 4: 테스트 실패 확인**

Run: `npm test -- csv`
Expected: FAIL — `buildRecordsCsv`가 아직 존재하지 않아 import 에러 또는 타입 에러

- [ ] **Step 5: 테스트 통과 확인**

Step 1-2를 이미 적용했다면 이 시점에 통과해야 한다.

Run: `npm test -- csv`
Expected: PASS (`buildRecordsCsv` 관련 3개 테스트 포함, 기존 테스트도 모두 통과)

- [ ] **Step 6: 커밋**

```bash
git add src/lib/csv.ts src/lib/csv.test.ts
git commit -m "feat: add buildRecordsCsv for exporting all students' life records"
```

---

### Task 2: `useAllRecords` — 전체 학생 생활기록 지연 조회 훅

**Files:**
- Create: `src/lib/hooks/useAllRecords.ts`
- Test: `src/lib/hooks/useAllRecords.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `useAllRecords(): { fetchAllRecords: () => Promise<{ data?: StudentRecord[]; error?: string }>, loading: boolean, error: string | null }` — Task 3이 `fetchAllRecords`를 호출해 Task 1의 `buildRecordsCsv`에 넘길 `records` 배열을 얻는다.

- [ ] **Step 1: 훅 구현**

`src/lib/hooks/useAllRecords.ts` 새로 생성:

```ts
import { useCallback, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { StudentRecord } from '../types'

/** 로스터 페이지의 "생활기록 전체 내보내기" 버튼을 눌렀을 때만 호출되는
 *  지연(lazy) 조회 훅 — 이 프로젝트의 다른 테이블 훅들과 달리 마운트 시
 *  자동으로 fetch하지 않는다. 반 전체의 모든 생활기록을 로스터 페이지에
 *  들어갈 때마다 미리 불러올 이유가 없고, 내보내기를 누른 순간에만
 *  필요하기 때문이다. */
export function useAllRecords() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAllRecords = useCallback(async (): Promise<{ data?: StudentRecord[]; error?: string }> => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from('records').select('*')

    setLoading(false)

    if (error) {
      setError(error.message)
      return { error: error.message }
    }
    return { data: data ?? [] }
  }, [])

  return { fetchAllRecords, loading, error }
}
```

(`.eq('student_id', ...)` 필터가 없다 — RLS의 `teacher_id = auth.uid()` 정책이 이미 현재 교사의 학생들에게 속한 기록으로만 결과를 제한한다. `.order(...)`도 필요 없다 — 정렬은 Task 1의 `buildRecordsCsv`가 담당한다.)

- [ ] **Step 2: 실패하는 테스트 작성**

`src/lib/hooks/useAllRecords.test.ts` 새로 생성:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { createQueryBuilder } from '../../test/supabaseMock'

const mockFrom = vi.fn()

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

const { useAllRecords } = await import('./useAllRecords')

beforeEach(() => {
  mockFrom.mockReset()
})

describe('useAllRecords', () => {
  it('does not fetch on mount', () => {
    renderHook(() => useAllRecords())
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('fetches all records across students on demand', async () => {
    const records = [
      {
        id: 'r1',
        student_id: 's-1',
        teacher_id: 't1',
        category: '학습',
        content: 'a',
        record_date: '2026-01-01',
        created_at: '2026-01-01T00:00:00Z',
      },
    ]
    const builder = createQueryBuilder({ data: records, error: null })
    mockFrom.mockReturnValue(builder)

    const { result } = renderHook(() => useAllRecords())

    let response: { data?: unknown[]; error?: string } | undefined
    await act(async () => {
      response = await result.current.fetchAllRecords()
    })

    expect(mockFrom).toHaveBeenCalledWith('records')
    expect(builder.select).toHaveBeenCalledWith('*')
    expect(response).toEqual({ data: records })
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(null)
  })

  it('surfaces the error message when fetch fails', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: '네트워크 오류' } })
    mockFrom.mockReturnValue(builder)

    const { result } = renderHook(() => useAllRecords())

    let response: { data?: unknown[]; error?: string } | undefined
    await act(async () => {
      response = await result.current.fetchAllRecords()
    })

    expect(response).toEqual({ error: '네트워크 오류' })
    expect(result.current.error).toBe('네트워크 오류')
  })
})
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- useAllRecords`
Expected: FAIL — `useAllRecords.ts` 파일이 아직 없어 import 에러

- [ ] **Step 4: 테스트 통과 확인**

Step 1을 이미 적용했다면 이 시점에 통과해야 한다.

Run: `npm test -- useAllRecords`
Expected: PASS (3개 테스트 모두)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/hooks/useAllRecords.ts src/lib/hooks/useAllRecords.test.ts
git commit -m "feat: add useAllRecords lazy hook for fetching every student's records"
```

---

### Task 3: `StudentListPage`에 내보내기 버튼 연결

**Files:**
- Modify: `src/routes/StudentListPage.tsx`

**Interfaces:**
- Consumes: `buildRecordsCsv(records, students)` (Task 1), `useAllRecords()` → `{ fetchAllRecords, loading, error }` (Task 2)
- Produces: 없음 (라우트 컴포넌트, 이 파일을 소비하는 다른 코드 없음)

- [ ] **Step 1: import 추가**

`src/routes/StudentListPage.tsx` 최상단 import 블록을 다음으로 교체:

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

- [ ] **Step 2: 내보내기 상태와 핸들러 추가**

`src/routes/StudentListPage.tsx`에서 현재:

```tsx
export function StudentListPage() {
  const { students, loading, error, refetch } = useStudents()
  const [activeTab, setActiveTab] = useState<Tab>('yorok')

  return (
```

다음으로 변경:

```tsx
export function StudentListPage() {
  const { students, loading, error, refetch } = useStudents()
  const [activeTab, setActiveTab] = useState<Tab>('yorok')
  const { fetchAllRecords, loading: exportingRecords } = useAllRecords()
  const [exportError, setExportError] = useState<string | null>(null)

  const handleExportRecords = async () => {
    setExportError(null)
    const result = await fetchAllRecords()
    if (result.error || !result.data) {
      setExportError(result.error ?? '생활기록을 불러오지 못했습니다.')
      return
    }
    const csv = buildRecordsCsv(result.data, students)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `생활기록_전체_${yyyymmdd(new Date())}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
```

(`'﻿'`는 UTF-8 BOM 문자로, `StudentListCard.tsx:99`의 `handleExportCsv`가 쓰는 것과 동일한 문자를 그대로 재사용한 것이다 — 새로 타이핑하지 말고 해당 파일에서 복사해 오는 편이 안전하다.)

- [ ] **Step 3: 로스터 탭에 버튼과 에러 배너 추가**

현재:

```tsx
      {activeTab === 'roster' ? (
        <div className="@container">
          {loading && (
```

다음으로 변경(직전에 버튼/에러 블록 삽입):

```tsx
      {activeTab === 'roster' ? (
        <div className="@container">
          {!loading && !error && students.length > 0 && (
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={handleExportRecords}
                disabled={exportingRecords}
                className={csvButtonClass}
              >
                <Download size={16} />
                {exportingRecords ? '내보내는 중...' : '생활기록 전체 내보내기'}
              </button>
            </div>
          )}

          {exportError && (
            <p className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {exportError}
            </p>
          )}

          {loading && (
```

(이후 `{loading && (...)}`부터 파일 끝까지 기존 JSX는 그대로 둔다 — 새 블록은 그 앞에 삽입만 한다.)

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 타입 에러 없이 성공

- [ ] **Step 5: 린트 확인**

Run: `npm run lint`
Expected: 통과

- [ ] **Step 6: 전체 테스트 확인**

Run: `npm test`
Expected: 기존 테스트 + Task 1/2에서 추가한 테스트 전부 통과 (라우트는 자동화 테스트 대상이 아니므로 회귀 확인 목적)

- [ ] **Step 7: 수동 브라우저 확인**

`npm run dev`로 로그인 후 `/students` → "누가기록" 탭에서:
- 우측 상단에 "생활기록 전체 내보내기" 버튼이 보이는지 확인
- 버튼 클릭 → CSV 파일이 다운로드되는지 확인, 파일명이 `생활기록_전체_YYYYMMDD.csv` 형식인지 확인
- 다운로드된 CSV를 열어(메모장 또는 실제 엑셀) 번호/이름/날짜/구분/내용 컬럼이 있는지, 학생 번호 순으로 정렬되어 있는지, 실제 등록된 기록 내용이 정확히 들어있는지 확인
- 학생이 0명이거나 로딩 중일 때는 버튼이 보이지 않는지 확인
- 버튼을 두 번 연달아 눌러도(연타) 각각 정상적으로 다운로드되는지 확인 (동시에 여러 파일이 섞이지 않는지)

- [ ] **Step 8: 커밋**

```bash
git add src/routes/StudentListPage.tsx
git commit -m "feat: add all-students records CSV export button to the roster tab"
```

## 영향받는 파일

- `src/lib/csv.ts` — `buildRecordsCsv`, `RecordExportStudent` 타입 추가. 타입 전용 import(`./types`) 추가.
- `src/lib/csv.test.ts` — `buildRecordsCsv` 테스트 3건 추가.
- `src/lib/hooks/useAllRecords.ts` (신규) — 지연 조회 훅.
- `src/lib/hooks/useAllRecords.test.ts` (신규) — 훅 테스트 3건.
- `src/routes/StudentListPage.tsx` — 내보내기 버튼/핸들러/에러 배너 추가.

배포에 별도 조치 불필요 — 신규 테이블/컬럼 없음, `records` 테이블은 이미 존재하며 RLS 정책도 이미 적용되어 있음.
