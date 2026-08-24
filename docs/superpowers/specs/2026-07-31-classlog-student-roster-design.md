---
render_with_liquid: false
---

# Classlog MVP: 학생 명부 + 생활기록/상담 기록 설계

## 배경

Classlog는 교사가 자기 반을 관리하는 학급관리 대시보드다. 최종적으로는 출결 관리, 공지사항/알림, 과제/점수 관리, 학급 자리 배치, 그리고 학생/학부모의 조회 접근까지 포함할 예정이지만, 범위가 크므로 단계적으로 만든다. 이 문서는 그중 1단계(MVP)인 **학생 명부 관리**와 **학생별 생활기록/상담 기록**만을 다룬다.

## 범위

**포함**
- 교사 1인 로그인 (이메일/비밀번호, Supabase Auth)
- 학생 명부: 등록/조회/수정/삭제
- 학생별 생활기록/상담 기록: 등록/조회/수정/삭제, 카테고리 필터

**제외 (다음 단계로 이연)**
- 학생/학부모 조회 접근 및 권한 분리
- 출결 관리
- 공지사항/알림
- 과제/점수 관리
- 학급 자리 배치
- 연도별/학기별 반 교체 및 과거 반 기록 보관

## 데이터 모델 (Supabase Postgres)

### `students`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid, PK | |
| teacher_id | uuid, FK → auth.users | 소유 교사 |
| number | int | 출석번호 |
| name | text | 이름 |
| gender | text (nullable) | 성별 |
| student_phone | text (nullable) | 본인 연락처 |
| parent_phone | text (nullable) | 학부모 연락처 |
| created_at | timestamptz | |

### `records`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid, PK | |
| student_id | uuid, FK → students | |
| teacher_id | uuid, FK → auth.users | 소유 교사 (RLS용 중복 저장) |
| category | text enum | `생활지도` \| `학습` \| `진로` \| `학부모상담` \| `기타` |
| content | text | 기록 내용 |
| record_date | date | 기록 대상 날짜 |
| created_at | timestamptz | |

### RLS 정책
- 두 테이블 모두 `teacher_id = auth.uid()`인 행만 select/insert/update/delete 허용.
- 지금은 교사가 1인이지만, 이 구조 덕분에 이후 여러 교사가 각자 자기 반만 보는 구조로 자연스럽게 확장 가능.

## 화면/라우트

React Router 기반으로 구성한다 (신규 의존성: `react-router-dom`).

| 라우트 | 화면 | 설명 |
|---|---|---|
| `/login` | 로그인 | 이메일/비밀번호 입력, 실패 시 에러 메시지 |
| `/students` | 학생 명부 (홈) | 출석번호순 목록, 이름 검색, 학생 추가 |
| `/students/:id` | 학생 상세 | 기본정보 + 생활기록/상담 타임라인(카테고리 필터), 기록 추가/수정/삭제 |
| `/students/:id/edit` | 학생 정보 수정 | 학생 기본정보 수정 폼 (모달 또는 별도 라우트) |

- 인증 가드: 로그인하지 않은 상태로 `/students*` 접근 시 `/login`으로 리다이렉트.
- 로그인 성공 시 `/students`로 이동.

## 컴포넌트/코드 구조

```
src/
  lib/
    supabaseClient.ts        (기존)
    hooks/
      useAuth.ts             로그인 상태, 로그인/로그아웃
      useStudents.ts         학생 목록 CRUD
      useStudentRecords.ts   특정 학생의 기록 CRUD
  routes/
    LoginPage.tsx
    StudentListPage.tsx
    StudentDetailPage.tsx
  components/
    StudentListItem.tsx
    StudentForm.tsx          학생 추가/수정 공용 폼
    RecordTimeline.tsx       카테고리 필터 + 타임라인 렌더링
    RecordForm.tsx           기록 추가/수정 폼
  App.tsx                    라우터 설정 + 인증 가드
```

- 스타일링: Tailwind CSS.
- 데이터 접근은 컴포넌트에서 Supabase를 직접 호출하지 않고, 위 커스텀 훅을 통해서만 이루어진다.

## 에러 처리

- 각 훅(`useStudents`, `useStudentRecords`, `useAuth`)은 `{ data, error, loading }` 형태로 상태를 반환한다.
- Supabase 호출 실패 시 화면에 간단한 에러 메시지를 표시한다 (토스트 또는 인라인 텍스트).
- 폼 검증: 학생 등록/수정 시 이름·출석번호 필수, 나머지 필드는 선택. 기록 등록 시 카테고리·날짜·내용 필수.

## 테스트 범위

- 핵심 데이터 훅(`useStudents`, `useStudentRecords`)에 대한 단위 테스트를 우선 작성한다.
- 전체 E2E 테스트는 이번 단계에서는 범위 밖이며, 이후 단계에서 검토한다.

## 향후 단계 (참고용, 이번 구현 범위 아님)

1. 학생/학부모 조회 권한 분리
2. 출결 관리
3. 공지사항/알림
4. 과제/점수 관리
5. 학급 자리 배치
6. 연도별 반 교체 및 과거 기록 보관
