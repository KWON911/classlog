# 홈 주간 출결 요일 박스 날짜 딥링크 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 주간 출결의 요일 박스 빈 영역 클릭으로 해당 날짜의 일일 출결 화면을 연다.

**Architecture:** `WeeklyAttendanceCard`는 날짜 기반 출결 URL을 만드는 작은 순수 함수를 사용한다. 요일 박스는 이 URL로 이동하는 버튼이며, 내부 학생 링크는 이벤트 전파를 막아 기존 학생 강조 URL을 유지한다.

**Tech Stack:** React 19, React Router 7, TypeScript, Vitest, Testing Library.

## Global Constraints

- `/attendance?date=YYYYMMDD` URL 계약과 `AttendancePage`의 기존 날짜 파싱을 재사용한다.
- 학생 배지의 `/attendance?date=YYYYMMDD&student=<id>` 이동 및 강조 동작은 유지한다.
- 출결이 없는 주의 기존 빈 상태 UI와 출결 데이터 저장 로직은 변경하지 않는다.
- 새 라이브러리를 추가하지 않는다.

---

### Task 1: 요일 박스용 날짜 링크 생성과 테스트

**Files:**
- Modify: `src/components/home/WeeklyAttendanceCard.tsx`
- Create: `src/components/home/WeeklyAttendanceCard.test.tsx`

**Interfaces:**
- Produces: `attendanceDatePath(date: string): string`, which returns `/attendance?date=${date}`.

- [ ] **Step 1: 실패하는 URL 생성 테스트를 작성한다**

```tsx
import { describe, expect, it } from 'vitest'
import { attendanceDatePath } from './WeeklyAttendanceCard'

describe('attendanceDatePath', () => {
  it('creates a daily attendance URL for the selected weekday', () => {
    expect(attendanceDatePath('20260915')).toBe('/attendance?date=20260915')
  })
})
```

- [ ] **Step 2: 테스트가 함수 미정의로 실패하는지 확인한다**

Run: `npm test -- src/components/home/WeeklyAttendanceCard.test.tsx`

Expected: `attendanceDatePath` export를 찾지 못해 실패.

- [ ] **Step 3: 최소 URL 생성 함수를 추가한다**

```tsx
export function attendanceDatePath(date: string) {
  return `/attendance?date=${date}`
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `npm test -- src/components/home/WeeklyAttendanceCard.test.tsx`

Expected: PASS.

### Task 2: 요일 박스 클릭 이동 구현

**Files:**
- Modify: `src/components/home/WeeklyAttendanceCard.tsx`
- Test: `src/components/home/WeeklyAttendanceCard.test.tsx`

**Interfaces:**
- Consumes: `attendanceDatePath(date: string)` from Task 1.
- Produces: 날짜 박스 빈 영역의 키보드/포인터 이동과, 학생 배지의 기존 개별 딥링크 유지.

- [ ] **Step 1: 박스 클릭 동작을 검증하는 실패 테스트를 추가한다**

```tsx
it('opens the selected date when the weekday box is clicked', () => {
  // Render a weekday containing an attendance badge, click its box outside the badge,
  // then assert the router location is `/attendance?date=20260915`.
})
```

- [ ] **Step 2: 테스트가 현재 클릭 동작 부재로 실패하는지 확인한다**

Run: `npm test -- src/components/home/WeeklyAttendanceCard.test.tsx`

Expected: 요일 박스 클릭 뒤 라우터 위치가 변경되지 않아 실패.

- [ ] **Step 3: 요일 박스를 버튼으로 바꾸고 내부 배지 전파를 막는다**

```tsx
<button
  type="button"
  onClick={() => navigate(attendanceDatePath(day.date))}
  aria-label={`${day.dayLabel} ${formatDayDate(day.date)} 출결 수정`}
>
  {/* existing day header and entries */}
  <Link onClick={(event) => event.stopPropagation()} to={`/attendance?date=${day.date}&student=${entry.student_id}`}>
    {/* existing badge label */}
  </Link>
</button>
```

Use a non-button interactive wrapper if needed to avoid nesting an anchor in a button; preserve equivalent keyboard operation and keep the badge's `stopPropagation` behavior.

- [ ] **Step 4: 컴포넌트 테스트를 통과시킨다**

Run: `npm test -- src/components/home/WeeklyAttendanceCard.test.tsx`

Expected: PASS.

- [ ] **Step 5: 관련 출결 테스트, lint, production build를 실행한다**

Run: `npm test -- src/components/home/WeeklyAttendanceCard.test.tsx src/routes/AttendancePage.test.tsx`

Expected: PASS.

Run: `npm run lint`

Expected: PASS.

Run: `npm run build`

Expected: PASS.
