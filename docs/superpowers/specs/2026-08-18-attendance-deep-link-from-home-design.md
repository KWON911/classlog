---
render_with_liquid: false
---

# 홈 주간 출결 카드 → 출결관리 딥링크 — 설계

## 배경

홈화면의 "주간 출결" 카드([2026-08-18-home-weekly-attendance-card-design.md](2026-08-18-home-weekly-attendance-card-design.md))는 학생 배지를 클릭하면 `/students/:id`(학생 상세)로 이동한다. 그 페이지에는 결석/지각/조퇴/결과 "요약 카운트"만 보이고, 정작 그 배지가 가리키는 그 날짜의 실제 출결 입력(사유·비고 등)은 보이지 않는다. 배지를 클릭한 교사의 의도는 "이 학생의 이 날짜 출결 기록을 확인/수정하고 싶다"이므로, 목적지를 출결관리(`/attendance`) 페이지의 해당 날짜·해당 학생으로 바꾼다.

## 범위

- `WeeklyAttendanceCard`의 배지 클릭 목적지를 `/students/:id`에서 `/attendance`로 변경.
- `/attendance`가 URL 쿼리 파라미터로 특정 날짜·학생을 받아, 그 날짜가 선택된 "일일 출결" 탭으로 열리고 해당 학생 행이 화면에 스크롤·강조되도록 한다.
- 기존 `/students/:id` 링크 자체(학급기록/학생 상세 페이지)는 변경하지 않는다 — 이 카드의 배지 링크만 바뀐다.

## URL 계약

`/attendance?date=YYYYMMDD&student=<student_id>`

- `date`: `YYYYMMDD` 형식(대시 없음) — `WeeklyAttendanceCard`가 이미 이 포맷(`day.date`)을 들고 있으므로 그대로 재사용, 별도 변환 불필요.
- `student`: 하이라이트할 학생의 `id` (UUID). 생략 가능 — 향후 "날짜만" 딥링크가 필요한 다른 진입점이 생겨도 재사용 가능하게 옵셔널로 둔다.
- 파라미터가 없으면 기존 동작(이번 달 첫 평일 선택, "일일 출결" 탭)과 동일.

## 아키텍처

### `AttendancePage.tsx`

- `react-router-dom`의 `useSearchParams`로 쿼리를 읽는다.
- `yearMonth`/`selectedDate`의 초기값(`useState`의 lazy initializer)을 `date` 파라미터가 있으면 그 값에서 파생시킨다 (`YYYYMMDD` → `yearMonth: 'YYYY-MM'`, `selectedDate: 'YYYY-MM-DD'`). 없으면 기존 `todayYearMonth()`/`firstWeekdayOfMonth(...)` 그대로.
- `activeTab`의 기본값은 이미 `'daily'`이므로 `date` 파라미터 유무와 무관하게 별도 처리 불필요.
- `student` 파라미터 값을 `highlightStudentId`로 `DailyStudentAttendance`에 그대로 전달.

### `DailyStudentAttendance.tsx`

- 새 prop `highlightStudentId?: string` 추가.
- 각 `AttendanceStudentRow`에 `highlighted={student.id === highlightStudentId}` 전달.
- `useEffect`(마운트 시 1회, `highlightStudentId` 의존)로 `document.getElementById(`student-row-${highlightStudentId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })` 호출.
- "변경 학생만 보기" 체크박스는 기본값이 꺼짐(`showChangedOnly = false`)이라 하이라이트 대상이 가려지는 경우는 없다. 결석 등 예외 상태 학생은 체크박스가 켜져 있어도 어차피 보이는 목록이므로 이 조합에서도 문제없다.

### `AttendanceStudentRow.tsx`

- 새 prop `studentId: string`, `highlighted?: boolean` 추가.
- 루트 `<div>`에 `id={`student-row-${studentId}`}` 부여.
- `highlighted`가 true면 기존 클래스에 강조 스타일(`ring-2 ring-brand-500`) 추가.

### `WeeklyAttendanceCard.tsx`

- 배지의 `<Link to={`/students/${entry.student_id}`}>`를 `<Link to={`/attendance?date=${day.date}&student=${entry.student_id}`}>`로 변경.

## 에러 처리 / 엣지 케이스

- `student` 파라미터가 가리키는 학생이 로스터에 없는 경우(삭제됨 등): `document.getElementById`가 `null`을 반환하므로 `scrollIntoView` 호출을 건너뛴다(옵셔널 체이닝으로 이미 안전). 별도 에러 메시지는 띄우지 않는다 — 나머지 화면은 정상 동작.
- `date` 파라미터가 잘못된 형식(8자리 숫자가 아님 등)인 경우: 파싱에 실패하면 기존 기본 동작(이번 달 첫 평일)으로 폴백한다. 이 경로는 이 카드가 항상 유효한 `YYYYMMDD`를 만들어 넘기므로 실제로 도달할 일은 없지만, 방어적으로 처리한다.

## 테스트 계획

- 이 변경이 닿는 파일은 모두 `src/routes/`, `src/components/`(라우트/컴포넌트) — 프로젝트 컨벤션상 별도 유닛 테스트를 만들지 않는다. `npm run build` + `npm run lint` + 브라우저 수동 스모크 테스트(홈에서 배지 클릭 → 출결관리로 이동 → 해당 날짜/학생 확인)로 검증한다.

## 범위 밖 (Out of scope)

- `/students/:id` 페이지 자체의 변경 — 학급기록 흐름은 그대로 둔다.
- 하이라이트 애니메이션의 지속 시간·페이드아웃 등 세부 UX 튜닝 — 최초 스크롤+강조 스타일만 구현.
