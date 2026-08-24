---
render_with_liquid: false
---

# 홈화면 기록 찾기(검색) — 설계

## 배경

교사가 학생 이름, 전화번호(특히 뒷자리만), 생활기록/상담 내용, 출결 사유·비고 등으로 빠르게 원하는 기록을 찾을 수 있는 검색 기능을 홈화면 상단에 추가한다. 예: 전화번호 뒷자리 4자리만 입력해도 그 번호가 누구(학생 본인/부/모/비상연락처) 것인지 바로 알 수 있다.

## 범위

- 검색 대상: `students`(전체 필드), `records`(생활기록/상담 내용), `attendance`(사유/비고).
- 검색창 위치: 홈화면(`/home`) 상단, 인사말 아래·시간표 카드 위. 다른 페이지에는 넣지 않는다(전역 헤더 검색은 범위 밖).
- 자리배치(`seating_plans`), 학교설정(`school_settings`)은 검색 대상에서 제외.

## 매칭 규칙

- **텍스트 필드**(이름, 성별, 주소, 부모명, 비고, 기록 내용 등): 대소문자 무시 부분 문자열(substring) 매칭.
- **전화번호류 필드**(`student_phone`, `father_phone`, `mother_phone`, `emergency_contact`): 검색어가 숫자로만 구성되어 있으면, 필드에서 숫자만 추출한 뒤 검색어로 **끝나는지(suffix match)** 비교한다. 검색어에 숫자 아닌 문자가 하나라도 섞여 있으면 전화번호 필드는 매칭 대상에서 제외한다(의미가 없으므로).
- 검색어가 2글자(또는 숫자 2자리) 미만이면 아무 매칭도 하지 않고 드롭다운을 띄우지 않는다.
- 매칭은 대소문자/자리수 구분 없이 모두 클라이언트에서 수행하며, 검색어가 바뀔 때마다 즉시(디바운스 없이) 재계산한다 — 데이터 총량이 학급 규모(20~30명, 기록 수백 건 이내)로 작아 즉시 재계산해도 부담이 없다.

## 아키텍처

### 새 훅: `useSearchIndex()`

- 위치: `src/lib/hooks/useSearchIndex.ts`.
- 현재 로그인한 교사의 `records`와 `attendance`를 검색에 필요한 열만 골라 한 번에 가져온다(월/학생 단위로 스코프하지 않음 — 기존 `useStudentRecords`/`useAttendance`와 달리 전체 기간·전체 학생 대상).
  ```ts
  supabase.from('records').select('id, student_id, category, content, record_date')
  supabase.from('attendance').select('id, student_id, status, reason_category, note, date')
  ```
- 반환 형태: 다른 Supabase 테이블 훅과 동일한 `{ records, attendance, loading, error }` 셰이프(생성/수정 기능은 필요 없음 — 읽기 전용 검색용).
- 학생 목록은 이 훅이 아니라 기존 `useStudents()`를 그대로 재사용한다(중복 조회 방지).

### 순수 함수: `searchAll`

- 위치: `src/lib/utils/searchIndex.ts`.
- 시그니처: `searchAll(query: string, students: Student[], records: StudentRecord[], attendance: AttendanceEntry[]): SearchResults`
- `SearchResults` 셰이프:
  ```ts
  type SearchResults = {
    students: { student: Student; matchedField: string }[]
    records: { record: StudentRecord; student: Student }[]
    attendance: { entry: AttendanceEntry; student: Student }[]
  }
  ```
  (레코드/출결 결과에 `student`를 함께 담는 이유: 드롭다운에 "3번 김민준 · …" 형식으로 누구 것인지 바로 보여줘야 하므로, 렌더링 시점에 매번 학생을 찾지 않도록 매칭 단계에서 조인해 둔다.)
- 각 그룹은 그룹당 최대 5건으로 자르고, 세 그룹 합쳐 최대 8건으로 다시 자른다(우선순위: 학생 > 생활기록 > 출결 — 학생 자체를 찾는 경우가 가장 흔할 것으로 예상).
- `student_id`가 가리키는 학생을 찾지 못하는 레코드/출결 행(삭제된 학생의 잔여 데이터 등)은 결과에서 제외한다.

### 새 컴포넌트: `HomeSearchBar`

- 위치: `src/components/home/HomeSearchBar.tsx`.
- 내부에서 `useStudents()`와 `useSearchIndex()`를 직접 호출한다(HomePage가 이미 다른 데이터를 여러 개 물고 있어 prop drilling보다 컴포넌트 자체 조회가 더 단순함 — 다른 홈 카드들도 각자 자기 훅을 호출하는 기존 패턴과 동일).
- 돋보기 아이콘(lucide-react `Search`) + `<input>` 한 줄. 포커스 상태 없이도 항상 보이는 입력창(토글 방식 아님).
- 입력값이 2자 미만이면 드롭다운 숨김. 2자 이상이면 `searchAll` 결과를 그룹 라벨("학생", "생활기록", "출결")과 함께 드롭다운으로 표시.
- 결과가 있는데 0건이면 "검색 결과가 없습니다" 표시.
- 항목 클릭 시:
  - 학생 매치 → `/students/:id`
  - 생활기록 매치 → `/students/:id`
  - 출결 매치 → `/attendance?date=YYYYMMDD&student=<id>` (기존 딥링크 계약 재사용 — `entry.date`는 DB에 `'YYYY-MM-DD'`로 저장되므로 대시를 제거해 `YYYYMMDD`로 변환해서 넘긴다)
  - 이동 후 입력값을 비우고 드롭다운을 닫는다.
- 드롭다운 바깥 클릭 또는 `Escape` 키로 닫는다.

### `HomePage.tsx` 배치

- 기존 `<h1>홈</h1>` / 인사말 블록과 시간표·식단표 그리드 사이에 `<HomeSearchBar />`를 한 줄 추가한다.

## 표시 형식

- 학생 결과: `{번호}번 {이름} · {매칭된 필드 라벨}: {매칭된 값}` (예: "3번 김민준 · 학생전번: 010-1234-5678").
- 생활기록 결과: `{번호}번 {이름} · {category} · {content 앞부분 요약}`.
- 출결 결과: `{번호}번 {이름} · {date를 M/D로} {status} · {note 앞부분 요약}` (note가 없으면 note 부분 생략).
- 매칭된 텍스트 자체를 굵게 강조하는 건 이번 범위에 넣지 않는다(단순 목록으로 충분 — YAGNI).

## 에러 처리

- `useSearchIndex()`의 `records`/`attendance` 조회가 실패해도 검색창 자체는 동작해야 한다 — 학생 검색은 계속 가능하고, 실패한 그룹만 결과에서 비어 있게 된다(별도 에러 배너 없이 조용히 생략; 홈화면의 다른 카드들처럼 별도 에러 UI를 추가하지 않는다 — YAGNI, 검색은 보조 기능이므로).

## 테스트 계획

- `useSearchIndex.test.ts`: 기존 Supabase 훅 테스트 패턴(`src/test/supabaseMock.ts`)을 따라 `records`/`attendance` 조회 파라미터와 반환 셰이프를 검증.
- `searchIndex.test.ts`: `searchAll`의 핵심 로직을 순수 함수 테스트로 검증 —
  - 이름 부분 문자열 매칭
  - 전화번호 뒷자리 매칭(숫자만 추출 후 suffix)
  - 검색어에 문자가 섞이면 전화번호 필드 제외
  - 2자 미만 검색어는 빈 결과
  - 그룹당 5건, 전체 8건 상한
  - 삭제된 학생을 가리키는 레코드/출결 행 제외
- `HomeSearchBar` 컴포넌트 자체는 프로젝트 컨벤션대로 별도 테스트를 만들지 않고 `npm run build` + `npm run lint` + 브라우저 수동 스모크 테스트로 검증한다.

## 범위 밖 (Out of scope)

- 홈 외 다른 페이지 헤더의 전역 검색.
- 자리배치·학교설정 데이터 검색.
- 매칭 텍스트 하이라이트(굵게 표시).
- 검색 결과 전체 목록 페이지(Enter 시 이동하는 별도 결과 페이지) — 드롭다운 미리보기로 충분하다고 판단.
- 서버사이드(Supabase) 검색 — 학급 규모상 클라이언트 필터링으로 충분.
