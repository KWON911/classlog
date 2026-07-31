# Classlog

교사가 자기 반 학생 명부와 생활기록/상담 기록을 관리하는 학급관리 대시보드입니다.

## 현재 범위 (MVP)

- 교사 로그인 (이메일/비밀번호)
- 학생 명부 등록/조회/수정/삭제
- 학생별 생활기록/상담 기록 등록/조회/수정/삭제 (카테고리 필터 포함)

향후 단계 계획은 `docs/superpowers/specs/2026-07-31-classlog-student-roster-design.md`의 "향후 단계" 절을 참고하세요.

## 시작하기

1. 의존성 설치

   ```bash
   npm install
   ```

2. Supabase 프로젝트 준비
   - Supabase 프로젝트의 SQL 편집기에서 `supabase/schema.sql`을 실행합니다.
   - **스키마가 이미 적용된 프로젝트에서 컬럼 구성이 바뀐 경우**: `create table if not exists`는 이미 존재하는 테이블에는 아무 효과가 없습니다. SQL 편집기에서 `drop table if exists records; drop table if exists students;`를 먼저 실행한 뒤, `supabase/schema.sql` 전체를 다시 실행하세요. (기존 데이터가 모두 삭제되니 주의하세요.)
   - Authentication → Users에서 로그인에 사용할 교사 계정을 하나 만듭니다.
   - `.env.example`을 `.env`로 복사하고, Supabase 프로젝트의 API 설정에서 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 값을 채웁니다.

3. 개발 서버 실행

   ```bash
   npm run dev
   ```

## 테스트 / 빌드

```bash
npm test        # useStudents, useStudentRecords 훅 단위 테스트
npm run build   # 타입체크 + 프로덕션 빌드
npm run lint    # oxlint
```
