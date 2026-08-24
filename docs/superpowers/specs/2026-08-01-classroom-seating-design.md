# 학급 자리 배치 설계

## 배경

교사가 반 학생들의 자리를 정하는 기능이 필요하다. 별도 프로젝트(https://github.com/KWON911/-seatsuffle, `apps/seat-change/index.html`)에 이미 만들어 둔 순수 HTML/CSS/JS 자리 배치 앱이 있고, 그 앱의 기능·UX·배치 알고리즘을 그대로 Classlog에 포팅한다. 다만 원본은 자체 Supabase 프로젝트에 별도의 명부 시스템(`class_rosters`/`students`)을 두고 있었는데, Classlog는 이미 학생 명부(`students` 테이블)가 있으므로 그걸 그대로 재사용하고, 원본의 정규화된 5개 테이블(명단 2개 + 자리표 3개) 대신 자리표 하나만 담당하는 테이블 1개로 단순화한다.

사이드바 네비게이션(`AppShell`)에 "출결관리" 바로 아래 "학급 자리 배치" 탭을 추가한다.

## 범위

**포함 (원본 기능 전체 이식)**
- 좌석 격자 설정: 행/열 입력, 칠판 방향(위/아래), 보기 전환(교사 시점/뒤에서 보기)
- 좌석 상태 편집: 특정 칸을 "빈자리"/"사용 안 함"으로 지정
- 학생 고정 좌석 지정
- 성별 지정 좌석(해당 성별 학생만 배치 가능)
- 분리 규칙: 두 학생이 인접(앞뒤·좌우)하지 않게, 또는 대각선 포함 인접하지 않게
- 성별 균형을 고려한 배치(같은 성별끼리 인접을 줄이는 소프트 스코어링)
- 지난 짝 피하기: 같은 기록 월에 저장된 자리표들에서 좌우로 앉았던 학생 쌍을 다시 붙이지 않도록 시도
- 자동 배치("자리 배치 시작"/"재배치"), 수동 조정(학생 두 명 클릭해서 자리 맞바꾸기 / 빈 좌석으로 이동)
- 저장(제목/날짜/기록 월), 기록 월 기준 목록 조회, 불러오기, 복제, 삭제
- 인쇄(화면 전용 UI 숨기고 좌석 격자만 출력)
- Classlog 기존 `students` 테이블을 그대로 사용 — 별도 명부 관리 없음

**제외**
- 원본에 없던 새 기능 추가 없음(이번 작업은 포팅) — 예: 좌석 배치 히스토리 통계, 짝 편성 추천 이유 표시 등은 다루지 않는다
- 모바일 대응 레이아웃(기존 앱 전체가 PC 기준인 것과 동일)
- 학부모/학생용 조회 화면

## 데이터 모델

원본의 `class_rosters`/`students`(자체 명부)는 가져오지 않는다 — Classlog `students`를 그대로 쓴다. `seating_assignments`/`seating_constraints`로 정규화했던 것도 테이블 1개로 합친다: 자리표는 항상 통째로 불러오고 저장하는 단위이고(개별 배치 행을 단독으로 조회할 일이 없음), `records`/`father_name`류와 마찬가지로 이 프로젝트는 접근 패턴이 "항상 함께 쓰이는 데이터"를 굳이 정규화하지 않는 원칙을 따른다.

`supabase/schema.sql`에 추가:

```sql
create table if not exists seating_plans (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) default auth.uid(),
  title text not null,
  plan_date date not null,
  rows integer not null,
  columns integer not null,
  teacher_direction text not null default 'north' check (teacher_direction in ('north', 'south')),
  seats jsonb not null,
  assignments jsonb not null,
  separations jsonb not null,
  gender_balance boolean not null default false,
  avoid_past_neighbors boolean not null default false,
  created_at timestamptz not null default now()
);

alter table seating_plans enable row level security;

create policy "teachers manage own seating plans" on seating_plans
  for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());
```

- `seats`/`assignments`/`separations` 안의 `student_id`, `seat_id` 값은 FK로 강제하지 않는다. `records`/`attendance`처럼 다른 교사 학생에 잘못 연결되면 데이터가 새는 구조(행이 존재해 조회에 잡힘)가 아니라, 그냥 같은 교사 소유 자리표 로우 안의 텍스트 값이라 교차 노출 위험이 없다.
- `plan_date`는 저장 시점의 날짜(제목 옆에 표시), `rows`/`columns`/`teacher_direction`은 컬럼으로 분리(목록에서 필터링/표시에 쓰이지 않지만 스키마 가독성을 위해 유지), 나머지 배치 상세는 JSONB.

`src/lib/types.ts`에 추가:

```ts
export type SeatStatus = 'available' | 'empty' | 'disabled'
export type TeacherDirection = 'north' | 'south'
export type SeatGender = 'male' | 'female'
export type SeparationType = 'orthogonal' | 'diagonal'

export type Seat = {
  id: string
  row: number
  column: number
  status: SeatStatus
  genderSeat?: SeatGender
}

export type SeatAssignment = {
  student_id: string
  seat_id: string
  is_fixed: boolean
  source: 'manual' | 'automatic'
}

export type SeatSeparation = {
  student_a: string
  student_b: string
  type: SeparationType
}

export type SeatingPlan = {
  id: string
  teacher_id: string
  title: string
  plan_date: string
  rows: number
  columns: number
  teacher_direction: TeacherDirection
  seats: Seat[]
  assignments: SeatAssignment[]
  separations: SeatSeparation[]
  gender_balance: boolean
  avoid_past_neighbors: boolean
  created_at: string
}
```

- `students.gender`(자유 텍스트)는 자리 배치 로직에서 `'남'` → male, `'여'` → female, 그 외(`null` 포함) → unspecified 세 값으로 매핑해서 사용한다. 이 매핑 함수는 `src/lib/seating.ts`에 둔다.

## 순수 로직 모듈 (`src/lib/seating.ts`)

원본의 배치 알고리즘(백트래킹 배치, 인접/대각선 판정, 점수 계산, 지난 짝 쌍 추출)은 React/Supabase에 의존하지 않는 순수 함수로 뽑아낸다. `src/lib/csv.ts`와 같은 성격의 모듈이며, 이 프로젝트에서 유닛 테스트가 붙는 대상은 `src/lib/`와 `src/lib/hooks/`뿐이므로 여기가 자리 배치 기능에서 유일하게 자동 테스트되는 부분이다.

주요 함수(원본 IIFE 안의 로직을 그대로 이식):
- `createSeats(rows, columns): Seat[]` — 좌석 격자 생성 (원본 `createLayout`)
- `shuffle<T>(items: T[]): T[]` — Fisher-Yates
- `mapGender(gender: string | null): 'male' | 'female' | 'unspecified'`
- `areAdjacent(a: Seat, b: Seat, type: SeparationType): boolean` — 원본 `areTooClose`
- `canUseSeat(studentGender, seat): boolean` — 성별 지정 좌석 검사
- `placeStudents(students, seats, { fixed, separations, genderSeats, avoidPairs }): Map<studentId, seatId>` — 백트래킹 배치. 실패 시 원본과 동일한 한국어 에러 메시지("현재 고정·분리·성별 자리 조건을 동시에 만족하는 자리를 찾지 못했습니다..." 등)를 던진다.
- `scorePlacement(candidate, students, options): number` — 성별 인접 페널티 + 지난 짝 인접 페널티 + 이전 좌석 반복 페널티(재배치가 매번 눈에 띄게 달라지도록 유도, 원본 `score`)
- `derivePastNeighborPairs(plans: SeatingPlan[]): Set<string>` — 여러 저장된 자리표에서 좌우 인접 학생 쌍 추출 (원본은 서버 함수 `listPastNeighborPairs`였지만, 저장된 자리표를 그대로 JSONB로 갖고 있으므로 클라이언트에서 계산)

`src/lib/seating.test.ts`에 유닛 테스트 작성:
- 고정 좌석이 재배치 후에도 유지되는지
- 분리 규칙(인접/대각선)이 실제로 지켜지는지, 위반하는 배치가 나오지 않는지
- 성별 지정 좌석에 다른 성별 학생이 배치되지 않는지
- `derivePastNeighborPairs`가 실제 좌우 인접 쌍만 추출하고 앞뒤/대각선은 제외하는지(이미 정렬된 fixture로는 걸러지지 않는 케이스를 반드시 포함 — CLAUDE.md 컨벤션)
- 학생 수가 사용 가능 좌석 수보다 많을 때 에러를 던지는지

## 훅 (`src/lib/hooks/useSeatingPlans.ts`)

`useAttendance(yearMonth)`와 동일한 모양:
- `useSeatingPlans(yearMonth: string)` — `plan_date`가 해당 월인 `seating_plans` 로우 전체 조회, `plans`/`loading`/`error` 노출
- `savePlan(id: string | null, payload)` — `id`가 없으면 insert, 있으면 해당 로우 update(upsert 아님 — 원본처럼 "다시 저장"은 명시적으로 같은 로우를 갱신)
- `deletePlan(id: string)`
- `refetch`
- `supabase`는 이 훅 내부에서만 참조(기존 hook-only 데이터 접근 경계 유지)

## 컴포넌트/페이지 구조

- `src/components/AppShell.tsx`: "출결관리" 바로 아래 `NavLink to="/seating"` "학급 자리 배치" 추가
- `src/App.tsx`: `/seating` 라우트를 기존 `AppShell` 레이아웃 아래 추가
- `src/components/SeatingGrid.tsx` (신규, 프레젠테이션 전용): 좌석 격자 렌더링만 담당. `AttendanceCalendar`와 같은 패턴 — 상태 없이 `seats`, `assignments`, `students`, `teacherDirection`, `viewMode`, `selectedSeatId` 등을 props로 받고 좌석 클릭 시 `onSeatClick(seatId)` 콜백만 호출. 클릭의 의미 해석(모드에 따라 고정 지정/성별 지정/맞바꾸기/상태 편집 중 무엇을 할지)은 하지 않는다.
- `src/routes/SeatingPage.tsx` (신규): 모든 상태(격자 설정, 좌석 배열, 배치 Map, 고정 Map, 성별 지정, 분리 규칙 목록, 현재 클릭 모드, 선택된 학생/좌석, 저장 폼 값)와 클릭 해석 로직(원본 `toggleSeatStatus` 디스패치) 보유.

**페이지 레이아웃**: 원본은 좁은 개인 사이트에 넣으려고 "설정" 모달을 썼지만, Classlog엔 모달 컴포넌트가 없고 다른 페이지도 전부 인라인 토글 방식(학생 상세정보 보기 등)이므로 모달 없이 한 페이지에 세로로 배치한다.

1. 상단: 제목 + 명단 상태(`useStudents`로 로드된 학생 수)
2. **레이아웃 설정**: 행/열 입력 + "좌석 구조 적용" 버튼, 칠판 방향, 보기 전환, 좌석 상태 편집 모드(빈자리/사용 안 함) 토글
3. **좌석 배치 격자**(`SeatingGrid`) — 항상 보임
4. **조건 설정**: 학생 고정(학생 선택 → 좌석 클릭), 성별 지정 좌석(버튼 → 좌석 클릭), 분리 규칙(학생 A/B + 인접·대각선 선택), 성별 균형 고려 체크박스, 지난 짝 피하기 체크박스 + 기록 월 입력, 설정된 조건 목록(삭제 가능)
5. **자동 배치 액션**: 자리 배치 시작 / 재배치 / 초기화
6. **저장 & 기록**: 제목/날짜/기록 월 입력 → 저장, 기록 월 기준 저장된 자리표 목록(불러오기/복제/삭제)
7. 인쇄 버튼 — 클릭 시 `window.print()`, `@media print` CSS로 좌석 격자 외 UI(설정/조건/저장 패널)를 숨기고 격자만 출력(원본 인쇄 스타일 그대로 이식). 원본과 달리 이번엔 `AppShell` 사이드바가 항상 함께 렌더링되므로, 사이드바(`AppShell`의 `<nav>`)에도 `@media print { display: none }`을 추가해야 인쇄 시 좌석 격자만 남는다.

## 저장/불러오기/지난 짝 피하기 흐름

- 저장: 제목 필수(빈 값이면 막고 포커스), 날짜 기본값 오늘, 기록 월 기본값 이번 달. 현재 좌석 상태·배치·고정·성별지정·분리규칙·체크박스 상태를 통째로 `seating_plans` 한 로우로 저장
- 불러오기: 목록에서 선택 → 해당 로우의 JSONB를 그대로 클라이언트 상태로 복원(원본 `restorePlan`과 동일)
- 복제: 불러오기 후 `id`를 비운 상태로 저장 폼에 채워, 다음 저장이 새 로우가 되게 함
- 지난 짝 피하기 체크 시: 기록 월에 저장된 `seating_plans`를 `useSeatingPlans(recordMonth)`로 불러와 `derivePastNeighborPairs`로 좌우 인접 쌍을 뽑고, `placeStudents`의 `avoidPairs`로 전달. 이 조건은 hard 제약이 아니라 "가능하면 피하기"(원본과 동일) — 도저히 못 피해도 에러 없이 최선 배치로 진행

## 에러 처리 / 에지 케이스

- 학생 수 > 사용 가능 좌석 수 → "자리 배치 시작" 전에 에러 메시지 표시, 배치 실행 안 함
- 고정·성별지정·분리규칙이 동시에 만족 불가능 → `placeStudents`가 던지는 에러 메시지를 화면에 표시(원본 문구 재사용)
- 좌석 구조(행/열) 재적용 시 현재 배치·조건이 있으면 `window.confirm`으로 확인 후 초기화(기존 코드베이스의 삭제 확인 패턴, 예: `StudentDetailPage`)
- 저장된 자리표 삭제 시 `window.confirm`
- `useSeatingPlans`는 기존 훅과 동일하게 `error: string | null`을 노출하고 페이지에서 `{error && <p className="text-red-600">{error}</p>}`로 표시

## 영향받는 코드

- `supabase/schema.sql`: `seating_plans` 테이블 + RLS 정책 추가
- `src/lib/types.ts`: `SeatStatus`, `TeacherDirection`, `SeatGender`, `SeparationType`, `Seat`, `SeatAssignment`, `SeatSeparation`, `SeatingPlan` 추가
- `src/lib/seating.ts` (신규): 순수 배치 알고리즘
- `src/lib/hooks/useSeatingPlans.ts` (신규)
- `src/components/SeatingGrid.tsx` (신규)
- `src/routes/SeatingPage.tsx` (신규)
- `src/components/AppShell.tsx`: "학급 자리 배치" 탭 추가
- `src/App.tsx`: `/seating` 라우트 추가

## 테스트 전략

기존 컨벤션(`src/lib/`, `src/lib/hooks/`만 자동 테스트, 컴포넌트/라우트는 `npm run build` + `npm run lint` + 수동 스모크 테스트)을 그대로 따른다.

- `src/lib/seating.test.ts` (신규): 위 "순수 로직 모듈" 절에 나열한 케이스(고정 좌석 유지, 분리 규칙 위반 없음, 성별 지정 좌석 준수, 지난 짝 쌍 추출의 인접 판정 정확성, 좌석 부족 시 에러)
- `src/lib/hooks/useSeatingPlans.test.ts` (신규): `createQueryBuilder` 목으로 월 범위 필터, `savePlan`의 insert/update 분기, `deletePlan`의 delete 호출을 검증
- `SeatingGrid`, `SeatingPage`, `AppShell`은 기존 컨벤션대로 자동화 테스트 범위 밖(빌드/린트 + 수동 스모크 테스트로 검증). 수동 확인 항목:
  - 행/열 변경 후 격자가 다시 그려지는지, 배치 있을 때 확인창이 뜨는지
  - 자동 배치가 좌석 부족/조건 불가능 시 에러를 보여주는지
  - 고정 좌석 학생이 재배치 후에도 그대로인지
  - 성별 지정 좌석에 반대 성별 학생이 배치되지 않는지
  - 분리 규칙을 건 두 학생이 인접하지 않는지
  - 지난 짝 피하기 체크 시 이전 자리표의 좌우 짝이 이번엔 다르게 배치되는지
  - 좌석 두 개 클릭으로 학생이 맞바뀌는지, 빈 좌석으로 이동이 되는지
  - 저장 → 목록에 나타남 → 불러오기 → 원래 배치 그대로 복원되는지
  - 복제 → 새 자리표로 저장되고 원본은 그대로인지
  - 삭제 → 확인창 → 목록에서 사라지는지
  - 인쇄 버튼 클릭 시 인쇄 미리보기에 좌석 격자만 보이는지
  - 사이드바에 "학급 자리 배치" 탭이 "출결관리" 바로 아래 나타나고, 클릭 시 `/seating`으로 이동하는지
