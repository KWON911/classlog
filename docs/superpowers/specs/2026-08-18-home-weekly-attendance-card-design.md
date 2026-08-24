---
render_with_liquid: false
---

# 홈화면 주간 출결 캘린더 카드 — 설계

## 배경

홈화면(`HomePage`)에는 이미 주간 시간표 카드(`WeeklyTimetableCard`)와 주간 식단표 카드(`WeeklyMealCard`)가 나란히 배치되어, 선택된 주(월~금, `weekStart`/`weekEnd`)의 정보를 보여주고 있다. 담임교사가 출결관리(`/attendance`)에 입력한 그 주의 출결 기록을 홈화면에서 바로 확인할 수 있게 세 번째 카드를 추가한다.

## 범위

- 홈화면의 선택된 주(월~금, 토·일 제외)에 해당하는 `attendance` 기록을 하루 칸씩 보여주는 새 카드.
- 기존 주 이동(이전 주/다음 주/오늘), 새로고침 버튼과 동일하게 동작.
- 출결관리 페이지 자체의 기능(입력/수정)은 변경하지 않는다 — 홈화면은 조회 전용.

## 아키텍처

### 새 훅: `useWeeklyAttendance(weekStart: Date, weekEnd: Date)`

- 위치: `src/lib/hooks/useWeeklyAttendance.ts`.
- 기존 `useAttendance(yearMonth)`는 월 단위로만 조회하기 때문에, 선택된 주가 두 달에 걸치는 경우(예: 1/29~2/2) 두 번 호출해서 병합해야 해 지저분해진다. 대신 `weekStart`~`weekEnd`(포함) 날짜 범위로 Supabase를 직접 조회하는 별도 훅을 둔다.
- 쿼리: `attendance` 테이블을 `students`와 조인해 학생 번호/이름을 함께 받아온다.
  ```ts
  supabase
    .from('attendance')
    .select('*, students(number, name)')
    .gte('date', yyyymmddDash(weekStart))
    .lte('date', yyyymmddDash(weekEnd))
  ```
  (`weekEnd`는 금요일이므로 `lte`로 포함, 토·일 날짜는 애초에 범위에 없으므로 별도 필터 불필요.)
  `attendance.date`는 `YYYY-MM-DD`(대시 포함) 형식으로 저장되는데(`useAttendance.ts`의 `monthRange`가 이 형식을 사용), 기존 `date-utils.ts`의 `yyyymmdd`는 대시 없는 `YYYYMMDD` 형식이라 그대로 못 쓴다. `date-utils.ts`에 `yyyymmddDash(d: Date): string`(`YYYY-MM-DD`)을 새로 추가해 이 훅에서 사용한다.
- 반환 형태: 다른 Supabase 테이블 훅과 동일한 `{ data, loading, error, refetch }` 셰이프. `data`는 학생 조인 결과가 포함된 `AttendanceEntry & { students: { number: string; name: string } | null }[]` 정도의 타입.
- RLS는 기존 `attendance` 정책(`teacher_id = auth.uid()`, `student_id`가 같은 teacher 소속인지 `exists` 서브쿼리로 검증)을 그대로 따른다 — 새 정책 불필요.

### 순수 함수: 그룹핑/정렬 로직

- 위치: `src/lib/utils/weeklyAttendance.ts`, 컴포넌트에서 분리해 유닛 테스트 가능하게 한다.
- `groupAttendanceByDate(days: Date[], entries): WeeklyAttendanceDay[]`
  - 각 요일(월~금)에 대해, 해당 날짜의 출결 항목들을 상태 우선순위(결석 → 지각 → 조퇴 → 결과) → 같은 상태 내 학생 번호 오름차순으로 정렬한 배열을 만든다.
  - `buildWeeklyTimetable`/`buildWeeklyMeal`과 동일한 패턴(요청한 날짜마다 빈 배열을 기본값으로 채움).

### 컴포넌트: `WeeklyAttendanceCard`

- 위치: `src/components/home/WeeklyAttendanceCard.tsx`.
- Props: `weekStart: Date`, `refreshToken: number`, `isCurrentWeek: boolean`, `onLoadingChange?: (loading: boolean) => void` — 기존 두 카드와 동일한 시그니처로 통일.
- `settings`(학교 설정)는 필요 없다 — 출결은 NEIS가 아니라 앱 내부 데이터이므로 학교 설정 여부와 무관하게 항상 조회를 시도한다.
- `refreshToken`이 바뀌면(새로고침 버튼) `refetch()`를 호출해 다른 두 카드와 함께 갱신되게 한다.

### `HomePage` 레이아웃 변경

- 기존 `grid-cols-1 lg:grid-cols-[minmax(0,42fr)_minmax(0,58fr)]` 그리드(시간표+식단표) 아래에, `WeeklyAttendanceCard`를 전체 폭(`w-full`)으로 한 줄 추가한다.
- `isRefreshing` 계산에 출결 카드의 로딩 상태도 포함시킨다 (`timetableLoading || mealLoading || attendanceLoading`).

## UI 상세

- 카드 구조는 `WeeklyTimetableCard`와 비슷하되, 교시 개념이 없으므로 헤더(월~금 날짜) 아래 **본문 행이 하나**뿐인 5열 그리드/테이블.
- 하루 칸 안에는 그 날 출결이 있는 학생마다 작은 배지(pill)를 세로로 쌓는다.
  - 배지 텍스트: `{번호}번 {이름} {상태}` (예: "3번 김민준 결석").
  - 배지 색: 기존 `ATTENDANCE_STATUS_COLOR_CLASS`(`src/lib/utils/attendanceStatusColors.ts`)를 그대로 재사용 — 결석=빨강, 지각=주황, 조퇴=보라, 결과=청록. 새 색 매핑을 만들지 않는다.
  - 배지 클릭 시 `/students/:id`(해당 학생 상세)로 이동.
  - 정렬은 위 `groupAttendanceByDate`가 만든 순서 그대로(상태 우선순위 → 번호순), 별도 상태 소제목 없이 배지 색으로만 구분한다.
- 그 날 출결 입력이 없는 칸은 시간표 카드의 빈 교시와 동일하게 `—`로 표시.
- 카드 전체 기준으로 그 주에 출결 입력이 하나도 없으면 기존 `EmptyState` 컴포넌트로 "이번 주 출결 특이사항이 없습니다" 메시지를 보여준다.
- 로딩 중이면 `LoadingState`, 에러면 `ErrorState`(재시도 버튼이 `refetch` 호출) — 두 컴포넌트 모두 `src/components/home/HomeCardStates.tsx`에 이미 존재하므로 재사용한다.

## 데이터 흐름 요약

1. `HomePage`가 `weekStart`(월요일)를 상태로 들고 있고, 기존처럼 `weekdaysOf(weekStart)`로 월~금 5일을 계산.
2. `WeeklyAttendanceCard`가 `useWeeklyAttendance(weekStart, weekEnd)`를 호출해 그 주 범위의 `attendance` 행(학생 조인 포함)을 가져온다.
3. `groupAttendanceByDate(weekdays, entries)`로 요일별 정렬된 학생 배지 목록을 만든다.
4. 각 요일 칸에 배지 목록을 렌더링, 없으면 `—`.

## 테스트 계획

- `useWeeklyAttendance.test.ts`: 기존 Supabase 훅 테스트 패턴(`src/test/supabaseMock.ts`)을 따라, 날짜 범위 쿼리 파라미터와 조인된 학생 정보 파싱을 검증. `vi.mock` 팩토리 내부 변수는 `mock` 접두사 필수(CLAUDE.md 컨벤션).
- `weeklyAttendance.test.ts`: `groupAttendanceByDate`의 상태 우선순위 정렬과 번호순 2차 정렬을 검증하는 순수 함수 테스트. 정렬 테스트이므로 "정렬 안 해도 우연히 통과하는" 픽스처를 피하고, 입력 순서와 다른 결과가 나오도록 픽스처를 구성한다(CLAUDE.md의 기존 정렬 테스트 함정 재발 방지 규칙).
- 컴포넌트(`WeeklyAttendanceCard`) 자체는 기존 컨벤션대로 별도 테스트를 만들지 않고, `npm run build` + `npm run lint` + 브라우저 수동 스모크 테스트로 검증한다.

## 범위 밖 (Out of scope)

- 출결 입력/수정 — 홈화면 카드는 읽기 전용이며, 클릭 시 학생 상세로 이동하는 것 외의 인터랙션은 없다.
- 사유(`reason_category`)나 비고(`note`) 표시 — 배지에는 상태만 표시하고, 상세 사유는 기존 출결관리/학생 상세 페이지에서 확인한다.
- 토·일 출결 기록의 표시 — 쿼리 범위 자체가 월~금이므로 자연히 제외된다.
