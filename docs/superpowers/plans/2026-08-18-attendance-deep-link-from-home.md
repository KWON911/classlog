# 홈 주간 출결 카드 → 출결관리 딥링크 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈화면 "주간 출결" 카드의 학생 배지를 클릭하면 `/students/:id`(학생 상세) 대신 `/attendance`(출결관리)로 이동해, 해당 날짜가 선택된 상태에서 그 학생 행이 스크롤·강조되게 한다.

**Architecture:** `/attendance?date=YYYYMMDD&student=<id>` 쿼리 파라미터로 딥링크한다. `AttendancePage`가 마운트 시 이 파라미터를 읽어 초기 `yearMonth`/`selectedDate`를 계산하고, `student` 값을 `highlightStudentId`로 `DailyStudentAttendance` → `AttendanceStudentRow`까지 내려보낸다. 해당 행은 `id` 속성을 갖고, 마운트 시 `scrollIntoView`로 스크롤되며 링 강조 스타일을 받는다.

**Tech Stack:** React 19 + TypeScript, React Router 7 (`useSearchParams`), Tailwind CSS v4.

## Global Constraints

- 이 변경이 닿는 파일은 모두 `src/routes/`, `src/components/`(컴포넌트/라우트) — 프로젝트 컨벤션상 별도 유닛 테스트를 만들지 않는다. `npm run build` + `npm run lint` + 브라우저 수동 스모크 테스트로 검증한다.
- `date` 쿼리 파라미터 포맷은 `YYYYMMDD`(대시 없음) — `WeeklyAttendanceCard`가 이미 이 포맷(`day.date`)을 들고 있으므로 변환 없이 그대로 사용한다.
- `/students/:id` 페이지 자체는 변경하지 않는다 — 이 카드의 배지 링크만 바뀐다.
- `student` 파라미터는 옵셔널이다 — 없으면 하이라이트 없이 날짜만 선택된다.

---

## Task 1: 출결관리 일일 화면에 학생 행 하이라이트/스크롤 기능 추가

**Files:**
- Modify: `src/components/AttendanceStudentRow.tsx`
- Modify: `src/components/DailyStudentAttendance.tsx`

**Interfaces:**
- Produces: `AttendanceStudentRow`의 새 필수 prop `studentId: string`과 옵셔널 prop `highlighted?: boolean`; 루트 엘리먼트의 `id={`student-row-${studentId}`}`. `DailyStudentAttendance`의 새 옵셔널 prop `highlightStudentId?: string` — Task 2(`AttendancePage`)가 이 prop으로 전달한다.

이 두 컴포넌트는 인터페이스(새 prop)와 그 유일한 소비처(같은 컴포넌트 내 호출부)가 서로 분리해서 리뷰/테스트할 수 없으므로 한 태스크로 묶는다. 프로젝트 컨벤션상 별도 유닛 테스트는 만들지 않는다.

- [ ] **Step 1: `AttendanceStudentRow`의 props 타입과 함수 시그니처 수정**

`src/components/AttendanceStudentRow.tsx`의 기존:

```tsx
type AttendanceStudentRowProps = {
  number: number
  name: string
  draft: AttendanceDraftEntry
  onChange: (patch: Partial<AttendanceDraftEntry>) => void
}

export function AttendanceStudentRow({ number, name, draft, onChange }: AttendanceStudentRowProps) {
```

다음으로 교체:

```tsx
type AttendanceStudentRowProps = {
  studentId: string
  number: number
  name: string
  draft: AttendanceDraftEntry
  onChange: (patch: Partial<AttendanceDraftEntry>) => void
  highlighted?: boolean
}

export function AttendanceStudentRow({ studentId, number, name, draft, onChange, highlighted }: AttendanceStudentRowProps) {
```

- [ ] **Step 2: 루트 `<div>`에 `id`와 강조 스타일 추가**

같은 파일의 기존:

```tsx
  return (
    <div
      className={`rounded-[10px] border border-gray-200 border-l-[3px] p-2.5 ${
        isPresent ? 'bg-white' : STATUS_ACCENT_CLASS[draft.status as AttendanceStatus]
      } ${!isPresent ? 'col-span-full' : ''}`}
    >
```

다음으로 교체:

```tsx
  return (
    <div
      id={`student-row-${studentId}`}
      className={`rounded-[10px] border border-gray-200 border-l-[3px] p-2.5 ${
        isPresent ? 'bg-white' : STATUS_ACCENT_CLASS[draft.status as AttendanceStatus]
      } ${!isPresent ? 'col-span-full' : ''} ${highlighted ? 'ring-2 ring-brand-500' : ''}`}
    >
```

- [ ] **Step 3: `DailyStudentAttendance`의 props 타입에 `highlightStudentId` 추가**

`src/components/DailyStudentAttendance.tsx`의 기존:

```tsx
type DailyStudentAttendanceProps = {
  selectedDate: string
  students: Student[]
  entries: AttendanceEntry[]
  loading: boolean
  /** Already grade-filtered by the caller, scoped to selectedDate. */
  events: SchoolEvent[]
  upsertEntry: (
    studentId: string,
    date: string,
    input: { status: NonNullable<AttendanceEntry['status']>; reason_category: AttendanceEntry['reason_category']; note: string | null },
  ) => Promise<UpsertResult>
  clearEntry: (studentId: string, date: string) => Promise<UpsertResult>
}
```

다음으로 교체:

```tsx
type DailyStudentAttendanceProps = {
  selectedDate: string
  students: Student[]
  entries: AttendanceEntry[]
  loading: boolean
  /** Already grade-filtered by the caller, scoped to selectedDate. */
  events: SchoolEvent[]
  upsertEntry: (
    studentId: string,
    date: string,
    input: { status: NonNullable<AttendanceEntry['status']>; reason_category: AttendanceEntry['reason_category']; note: string | null },
  ) => Promise<UpsertResult>
  clearEntry: (studentId: string, date: string) => Promise<UpsertResult>
  highlightStudentId?: string
}
```

- [ ] **Step 4: 함수 시그니처에 `highlightStudentId` 추가**

같은 파일의 기존:

```tsx
export function DailyStudentAttendance({
  selectedDate,
  students,
  entries,
  loading,
  events,
  upsertEntry,
  clearEntry,
}: DailyStudentAttendanceProps) {
```

다음으로 교체:

```tsx
export function DailyStudentAttendance({
  selectedDate,
  students,
  entries,
  loading,
  events,
  upsertEntry,
  clearEntry,
  highlightStudentId,
}: DailyStudentAttendanceProps) {
```

- [ ] **Step 5: 마운트 시 스크롤하는 `useEffect` 추가**

같은 파일에서, 기존 draft 초기화 `useEffect` 블록(`setDraft(next)` ... `setStatusMessage(null)`로 끝나는 블록) 바로 아래에 추가:

```tsx
  useEffect(() => {
    if (!highlightStudentId) return
    document.getElementById(`student-row-${highlightStudentId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightStudentId])
```

(`useEffect`는 파일 상단에서 이미 `import { useEffect, useMemo, useState } from 'react'`로 가져오고 있으므로 추가 import 불필요.)

- [ ] **Step 6: `AttendanceStudentRow` 호출부에 `studentId`/`highlighted` 전달**

같은 파일의 기존:

```tsx
              {visibleStudents.map((student) => (
                <AttendanceStudentRow
                  key={student.id}
                  number={student.number}
                  name={student.name}
                  draft={draft.get(student.id) ?? defaultDraft()}
                  onChange={(patch) => updateDraft(student.id, patch)}
                />
              ))}
```

다음으로 교체:

```tsx
              {visibleStudents.map((student) => (
                <AttendanceStudentRow
                  key={student.id}
                  studentId={student.id}
                  number={student.number}
                  name={student.name}
                  draft={draft.get(student.id) ?? defaultDraft()}
                  onChange={(patch) => updateDraft(student.id, patch)}
                  highlighted={student.id === highlightStudentId}
                />
              ))}
```

- [ ] **Step 7: 빌드/린트 확인**

Run: `npm run build && npm run lint`
Expected: 둘 다 에러 없이 통과 (아직 `AttendancePage`가 `highlightStudentId`를 넘기지 않으므로 `undefined`로 전달되는 셈이지만, 옵셔널 prop이라 타입 에러 없음).

- [ ] **Step 8: Commit**

```bash
git add src/components/AttendanceStudentRow.tsx src/components/DailyStudentAttendance.tsx
git commit -m "feat: highlight and scroll to a student row in daily attendance"
```

---

## Task 2: `AttendancePage`에서 쿼리 파라미터로 초기 날짜·학생 지정

**Files:**
- Modify: `src/routes/AttendancePage.tsx`

**Interfaces:**
- Consumes: `DailyStudentAttendance`의 새 `highlightStudentId?: string` prop (Task 1).
- Produces: `/attendance?date=YYYYMMDD&student=<id>` URL 계약 — Task 3(`WeeklyAttendanceCard`)가 이 형식으로 링크를 만든다.

- [ ] **Step 1: `useSearchParams` import 추가**

`src/routes/AttendancePage.tsx` 최상단 import 블록의 기존:

```tsx
import { useMemo, useState } from 'react'
import { useStudents } from '../lib/hooks/useStudents'
```

다음으로 교체:

```tsx
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStudents } from '../lib/hooks/useStudents'
```

- [ ] **Step 2: `YYYYMMDD` 쿼리값을 `yearMonth`/`selectedDate`로 파싱하는 헬퍼 추가**

파일 상단, `firstWeekdayOfMonth` 함수 바로 아래에 추가:

```tsx
function parseDateParam(dateParam: string | null): { yearMonth: string; selectedDate: string } | null {
  if (!dateParam || !/^\d{8}$/.test(dateParam)) return null
  const year = dateParam.slice(0, 4)
  const month = dateParam.slice(4, 6)
  const day = dateParam.slice(6, 8)
  return { yearMonth: `${year}-${month}`, selectedDate: `${year}-${month}-${day}` }
}
```

- [ ] **Step 3: 컴포넌트 시작부에서 쿼리 파라미터를 읽어 초기 state에 반영**

`export function AttendancePage() {` 함수 본문의 기존:

```tsx
export function AttendancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('daily')
  const [yearMonth, setYearMonth] = useState(todayYearMonth())
  const [selectedDate, setSelectedDate] = useState(firstWeekdayOfMonth(todayYearMonth()))
```

다음으로 교체:

```tsx
export function AttendancePage() {
  const [searchParams] = useSearchParams()
  const dateFromQuery = parseDateParam(searchParams.get('date'))
  const highlightStudentId = searchParams.get('student') ?? undefined

  const [activeTab, setActiveTab] = useState<Tab>('daily')
  const [yearMonth, setYearMonth] = useState(dateFromQuery?.yearMonth ?? todayYearMonth())
  const [selectedDate, setSelectedDate] = useState(dateFromQuery?.selectedDate ?? firstWeekdayOfMonth(todayYearMonth()))
```

(`activeTab`의 기본값은 이미 `'daily'`이므로 쿼리 파라미터 유무와 무관하게 그대로 둔다.)

- [ ] **Step 4: `DailyStudentAttendance` 호출부에 `highlightStudentId` 전달**

기존:

```tsx
            <DailyStudentAttendance
              selectedDate={selectedDate}
              students={students}
              entries={entries}
              loading={loading}
              events={selectedDateEvents}
              upsertEntry={upsertEntry}
              clearEntry={clearEntry}
            />
```

다음으로 교체:

```tsx
            <DailyStudentAttendance
              selectedDate={selectedDate}
              students={students}
              entries={entries}
              loading={loading}
              events={selectedDateEvents}
              upsertEntry={upsertEntry}
              clearEntry={clearEntry}
              highlightStudentId={highlightStudentId}
            />
```

- [ ] **Step 5: 빌드/린트 확인**

Run: `npm run build && npm run lint`
Expected: 둘 다 에러 없이 통과.

- [ ] **Step 6: Commit**

```bash
git add src/routes/AttendancePage.tsx
git commit -m "feat: read date/student query params to deep-link into daily attendance"
```

---

## Task 3: `WeeklyAttendanceCard`의 배지 링크를 출결관리로 변경

**Files:**
- Modify: `src/components/home/WeeklyAttendanceCard.tsx`

**Interfaces:**
- Consumes: Task 2에서 확정된 `/attendance?date=YYYYMMDD&student=<id>` URL 계약.

- [ ] **Step 1: `Link`의 `to` 변경**

`src/components/home/WeeklyAttendanceCard.tsx`의 기존:

```tsx
                          <Link
                            to={`/students/${entry.student_id}`}
                            className={`block rounded px-1.5 py-1 text-center text-[11px] font-medium ${ATTENDANCE_STATUS_COLOR_CLASS[entry.status]}`}
                          >
```

다음으로 교체:

```tsx
                          <Link
                            to={`/attendance?date=${day.date}&student=${entry.student_id}`}
                            className={`block rounded px-1.5 py-1 text-center text-[11px] font-medium ${ATTENDANCE_STATUS_COLOR_CLASS[entry.status]}`}
                          >
```

(`day.date`는 이미 `groupAttendanceByDate`가 만든 `'YYYYMMDD'` 형식 — 별도 변환 불필요.)

- [ ] **Step 2: 빌드/린트 확인**

Run: `npm run build && npm run lint`
Expected: 둘 다 에러 없이 통과.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/WeeklyAttendanceCard.tsx
git commit -m "feat: link weekly-attendance badges to the daily attendance page"
```

---

## Task 4: 전체 검증 + 브라우저 스모크 테스트

**Files:** 없음 (검증 전용 태스크).

- [ ] **Step 1: 전체 테스트 스위트 실행**

Run: `npm test`
Expected: 기존 테스트 전부 통과(이 브랜치는 컴포넌트/라우트만 건드리므로 신규 테스트 없음).

- [ ] **Step 2: 빌드 + 린트**

Run: `npm run build && npm run lint`
Expected: 둘 다 에러 없이 통과.

- [ ] **Step 3: 브라우저로 실제 동작 확인**

1. `npm run dev` (또는 이미 떠 있는 dev 서버 사용), 로그인.
2. 출결관리에서 이번 주 평일 하루에 학생 2명 이상 서로 다른 상태로 출결 입력(이미 입력돼 있으면 생략).
3. 홈(`/home`)으로 이동, "주간 출결" 카드에서 방금 입력한 학생 배지를 클릭.
4. `/attendance?date=...&student=...`로 이동하고, "일일 출결" 탭이 선택된 채 해당 날짜가 캘린더에서 선택돼 있는지 확인.
5. 클릭한 학생의 행이 화면에 자동으로 스크롤되고, 파란 링(강조 테두리)이 표시되는지 확인.
6. 다른 학생 배지(다른 학생)를 클릭해도 같은 방식으로 그 학생 행이 강조되는지 확인.
7. `date`/`student` 파라미터 없이 `/attendance`에 직접 접속했을 때 기존 동작(이번 달 첫 평일, 강조 없음)이 그대로인지 확인 — 회귀 없는지 확인.

문제 발견 시 해당 Task로 돌아가 수정 후 이 Task를 다시 수행한다.

- [ ] **Step 4: 최종 커밋 (필요 시)**

스모크 테스트 중 수정 사항이 있었다면:

```bash
git add -A
git commit -m "fix: address issues found in attendance deep-link smoke test"
```

수정 사항이 없었다면 이 스텝은 건너뛴다.
