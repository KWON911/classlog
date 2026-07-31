# 출결 관리 및 사이드바 네비게이션 설계

## 배경

교사가 학생 명부(Student)와 생활기록(StudentRecord)에 이어, 학생별 출결(결석/지각/조퇴/결과)을 날짜 단위로 기록하고 조회할 수 있어야 한다. 기능이 늘어나면서 화면 이동 구조도 함께 정리한다 — 현재는 `StudentListPage` 상단 버튼으로만 기능이 노출되는데, 출결관리가 추가되면 왼쪽에 고정된 탭 네비게이션으로 전환한다.

## 범위

**포함**
- `attendance` 테이블: 학생별 출결 예외(결석/지각/조퇴/결과)를 날짜 단위로 기록. 출석은 별도 행 없이 "예외 없음"으로 간주한다(유즈 케이스: 결석/지각 등은 소수이고 대부분은 출석이므로 예외만 저장하는 편이 입력량과 데이터 양 모두 적다).
- 출결 전용 페이지(`/attendance`): 월 선택 + 날짜별 학생 출결 입력, 그 달 학급 전체 결석·지각·조퇴·결과 횟수 요약 표.
- 학생 상세 페이지에 해당 학생의 전체 누적 출결 요약(결석/지각/조퇴/결과 횟수) 추가.
- 사이드바 네비게이션(`AppShell`): 왼쪽에 "학급기록"/"출결관리"/"명부 관리" 3개 탭 + 로그아웃 버튼을 고정 배치. 기존에 `StudentListPage` 헤더에 있던 학생 추가/CSV 가져오기/전체 삭제 버튼을 새 `/students/manage` 페이지로 이전.

**제외**
- 교시별/과목별 출결 (하루 1회 단위로 충분하다고 확인됨)
- 출결 데이터의 학기/연도별 구분이나 이월 처리 (기존 `docs/.../classlog-student-roster-design.md`의 "향후 단계" 6번 — 연도별 반 교체 — 와 함께 다룰 별도 범위)
- 학부모/학생용 조회 화면
- 모바일 대응 레이아웃 (현재 앱 전체가 PC 사용을 기준으로 함)
- 출결 통계의 CSV/인쇄 내보내기

## 데이터 모델

`supabase/schema.sql`에 `attendance` 테이블을 추가한다. `records` 테이블과 동일한 구조·RLS 패턴을 따른다.

```sql
create table attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) default auth.uid(),
  date date not null,
  status text not null check (status in ('결석', '지각', '조퇴', '결과')),
  reason_category text not null check (reason_category in ('질병', '미인정', '인정', '기타')),
  note text,
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

alter table attendance enable row level security;

create policy "teachers manage own attendance" on attendance
  for all
  using (teacher_id = auth.uid())
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from students s
      where s.id = student_id
        and s.teacher_id = auth.uid()
    )
  );
```

- `unique (student_id, date)`로 학생당 하루 1행만 허용한다. 상태를 바꿀 땐 해당 행을 update, 출석으로 되돌릴 땐 delete한다.
- `출석`은 `status`의 enum 값이 아니다 — 이 테이블에 그 학생·날짜 행이 없는 상태 자체가 출석을 의미한다.
- `reason_category`는 결석/지각/조퇴/결과 4개 상태 모두에 공통으로 적용되는 고정 분류(질병/미인정/인정/기타)이며, `note`는 선택적 자유 텍스트 메모다.
- `records.category`와 마찬가지로 `status`/`reason_category`의 허용값은 Postgres `check` 제약과 TypeScript 유니언 타입(`src/lib/types.ts`) 두 곳에 동일하게 정의하고 유지한다.

`src/lib/types.ts`에 추가:

```ts
export type AttendanceStatus = '결석' | '지각' | '조퇴' | '결과'
export type AttendanceReasonCategory = '질병' | '미인정' | '인정' | '기타'

export type AttendanceEntry = {
  id: string
  student_id: string
  teacher_id: string
  date: string
  status: AttendanceStatus
  reason_category: AttendanceReasonCategory
  note: string | null
  created_at: string
}
```

## 훅 (`src/lib/hooks/`)

**`useAttendance(yearMonth: string)`** — `yearMonth`는 `'2026-08'` 형태. `/attendance` 페이지 전용.
- `entries: AttendanceEntry[]` — 해당 월 전체 학생의 예외 행 (`date`를 `.gte`/`.lt`로 월 범위 필터).
- `upsertEntry(studentId, date, { status, reason_category, note })` — Supabase `.upsert(..., { onConflict: 'student_id,date' })`로 insert/update를 한 번에 처리.
- `clearEntry(studentId, date)` — 해당 행 delete (출석으로 되돌리기).
- `yearMonth`가 바뀌면 자동 재조회. 다른 훅과 동일하게 `loading`/`error` 노출.
- 학급 전체 요약(학생별 상태 카운트)은 훅에 별도로 두지 않고, `/attendance` 페이지 컴포넌트가 `entries`를 `useMemo`로 집계한다.

**`useAttendanceSummary(studentId: string)`** — 학생 상세 페이지 전용.
- 해당 학생의 `attendance` 행을 기간 제한 없이 전체 조회 (`eq('student_id', studentId)`).
- `status`별 개수를 `useMemo`로 집계해 `{ 결석, 지각, 조퇴, 결과 }` 형태로 반환.
- 예외만 저장되므로 학생 한 명의 누적 행 수는 적어 페이지네이션 없이 한 번에 조회한다.

두 훅 모두 `supabase`는 훅 내부에서만 참조하며(기존 hook-only 데이터 접근 경계 유지), 컴포넌트/라우트에서 직접 호출하지 않는다.

## 네비게이션 / 레이아웃

`ProtectedRoute`의 `<Outlet/>` 레이아웃을 좌우 2단 구조로 바꾼다.

```
┌─────────────┬──────────────────────────────┐
│  학급기록     │                                │
│  출결관리     │        (선택된 탭의 페이지)      │
│             │                                │
│             │                                │
│             │                                │
│  명부 관리    │                                │
│  [로그아웃]  │                                │
└─────────────┴──────────────────────────────┘
```

- 새 컴포넌트 `AppShell`이 `ProtectedRoute` 내부에서 `<Outlet/>`을 감싸는 고정 레이아웃 역할을 한다. `/students`, `/students/:id`, `/students/manage`, `/attendance` 간 전환에도 사이드바는 리마운트되지 않는다.
- 탭은 `NavLink`로 구현해 현재 경로에 맞게 자동 강조된다. "학급기록" 탭은 `/students`와 `/students/:id` 모두에서 활성 상태로 표시(prefix 매칭). "명부 관리"는 하단, 로그아웃 바로 위에 배치해 상단 2개 탭과 시각적으로 분리한다(자주 안 쓰는 설정성 작업이라는 성격 반영).
- 라우트 구성(`src/App.tsx`): `/students`(학급기록 = 기존 명부 목록), `/students/:id`(학생 상세, 사이드바 탭에는 없고 학급기록에서 진입), `/students/manage`(명부 관리, 신규), `/attendance`(출결관리, 신규) — 모두 같은 `AppShell` 아래.
- **`StudentListPage`("학급기록")**: 검색 + 번호/이름 그리드만 남긴다. 학생 추가/CSV 가져오기/전체 삭제 버튼은 제거.
- **`StudentManagePage`("명부 관리", 신규)**: 지금 `StudentListPage`에 토글로 붙어 있던 학생 추가 폼(`StudentForm`), CSV 가져오기(`ImportStudentsPanel`), 전체 삭제 버튼을 그대로 옮겨온다. UI 로직 자체는 변경 없이 파일만 이동.

## `/attendance` 페이지 UI

- 상단: 월 선택(◀ 2026년 8월 ▶) — `useAttendance(yearMonth)` 호출.
- 그 달 안에서 날짜 선택(기본값 오늘, 오늘이 해당 월이 아니면 1일).
- 선택한 날짜의 학생 전체 목록: 예외가 없는 학생은 기본 표시(출석), 예외가 있는 학생만 상태·사유가 표시된 채로 렌더링.
- 학생 행 클릭 → 상태(결석/지각/조퇴/결과) + 사유(질병/미인정/인정/기타) + 메모 입력 UI 노출 → 저장 시 `upsertEntry`, "출석으로 되돌리기" 클릭 시 `clearEntry`.
- 하단: 그 달 학급 전체 요약 표 (행: 학생, 열: 결석/지각/조퇴/결과 횟수).

## 학생 상세 페이지 변경

`StudentDetailPage`의 헤더 근처(항상 보이는 위치, "상세정보 보기" 토글과는 무관)에 `useAttendanceSummary(student.id)` 기반 누적 요약 한 줄을 추가한다.

```
결석 2 · 지각 1 · 조퇴 0 · 결과 0
```

기존 12개 필드 `<dl>` 블록과는 별도이며, "상세정보 보기"를 열지 않아도 항상 보인다.

## 에러 처리

- `useAttendance`/`useAttendanceSummary`는 기존 훅과 동일하게 `error: string | null`을 노출하고, 페이지에서 `{error && <p className="text-red-600">{error}</p>}` 형태로 표시한다.
- `unique(student_id, date)` 충돌은 `upsertEntry`가 `onConflict: 'student_id,date'`로 update 처리하므로 애초에 발생하지 않는다.
- `attendance`의 RLS 정책도 `records`와 동일하게 `student_id`가 현재 교사 소유인지 subquery로 검증한다 — 다른 교사의 학생에게 출결을 기록하려는 시도는 DB 레벨에서 차단되고, Supabase가 반환하는 에러 메시지가 그대로 화면에 노출된다. 별도 클라이언트 검증은 추가하지 않는다.
- `/students/manage`로 페이지가 이동해도 CSV 가져오기의 미리보기/검증 흐름(`ImportStudentsPanel`, `parseStudentsCsv`)은 로직 변경 없이 그대로 재사용된다.

## 영향받는 코드

- `supabase/schema.sql`: `attendance` 테이블 + RLS 정책 추가
- `src/lib/types.ts`: `AttendanceStatus`, `AttendanceReasonCategory`, `AttendanceEntry` 추가
- `src/lib/hooks/useAttendance.ts` (신규), `src/lib/hooks/useAttendanceSummary.ts` (신규)
- `src/components/AppShell.tsx` (신규): 사이드바 레이아웃
- `src/App.tsx`: `AppShell`을 `ProtectedRoute` 레이아웃에 적용, `/students/manage`·`/attendance` 라우트 추가
- `src/routes/StudentListPage.tsx`: 학생 추가/CSV/전체 삭제 UI 제거, 검색+그리드만 남김
- `src/routes/StudentManagePage.tsx` (신규): `StudentListPage`에서 제거한 UI 이식
- `src/routes/AttendancePage.tsx` (신규): 월/날짜 선택, 학생별 출결 입력, 학급 전체 요약 표
- `src/routes/StudentDetailPage.tsx`: 누적 출결 요약 줄 추가

## 테스트 전략

기존 컨벤션(`src/lib/`, `src/lib/hooks/`만 자동 테스트, 컴포넌트/라우트는 `npm run build` + `npm run lint` + 수동 스모크 테스트)을 그대로 따른다.

- `src/lib/hooks/useAttendance.test.ts` (신규): `createQueryBuilder` 목으로 월 범위 필터(`.gte`/`.lt`), `upsertEntry`의 `onConflict` 호출, `clearEntry`의 delete 호출을 검증. 집계(학급 전체 요약)는 컴포넌트 쪽 로직이므로 여기서는 원본 `entries` 배열만 검증한다.
- `src/lib/hooks/useAttendanceSummary.test.ts` (신규): 한 학생의 `attendance` 행들을 상태가 섞인 순서의 fixture로 주고, 상태별 카운트가 올바르게 집계되는지 검증한다. (CLAUDE.md에 기록된 "정렬된 fixture는 정렬 로직이 깨져도 통과한다" 문제와 같은 이유로, 카운트 로직도 상태가 섞인/편중되지 않은 fixture로 검증한다.)
- `AppShell`, `StudentManagePage`, `AttendancePage`, `StudentDetailPage`의 요약 UI는 기존 컨벤션대로 자동화 테스트 범위 밖(빌드/린트 + 수동 스모크 테스트로 검증).
