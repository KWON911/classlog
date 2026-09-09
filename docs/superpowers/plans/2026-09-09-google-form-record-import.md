# Google Form 누가기록 연동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Google Form의 기존·신규 교사기록 응답을 중복 없이 Classlog 학생별 누가기록으로 저장한다.

**Architecture:** Apps Script가 최소 payload를 Vercel 수신 API로 보내고, API는 공유 비밀과 서버 설정을 검증한 뒤 service-role Supabase RPC를 호출한다. RPC가 이름 검증·응답 ID 중복 방지·다건 기록 저장을 한 트랜잭션으로 처리한다.

**Tech Stack:** TypeScript, Vercel Serverless Functions, Supabase Postgres, Google Apps Script, Vitest

## Global Constraints

- 교사기록만 `content`로 저장하며 관찰 체크 항목과 외부 카테고리는 저장하지 않는다.
- 모든 가져온 기록의 카테고리는 내부 필수값 `생활지도`으로 고정한다.
- service-role key와 공유 비밀을 브라우저·저장소·Apps Script 소스에 넣지 않는다.
- 기존 `records` 데이터를 삭제하거나 재생성하지 않는다.

---

### Task 1: Payload 검증

**Files:**
- Create: `src/lib/googleFormRecordImport.ts`
- Create: `src/lib/googleFormRecordImport.test.ts`

- [x] 테스트로 `responseId`, 이름 배열, 교사기록, `YYYY-MM-DD` 날짜를 정규화하고 빈 값·중복 이름·잘못된 날짜를 거부한다.
- [x] 실패를 확인한 뒤 최소 검증 함수를 구현하고 대상 테스트를 통과시킨다.

### Task 2: 중복 방지 RPC migration

**Files:**
- Create: `supabase/migrations/20260909_google_form_record_import.sql`

- [x] 외부 응답 ID를 기본키로 하는 import 추적 테이블, RLS, service-role 전용 `import_google_form_record` RPC를 추가한다.
- [x] RPC에서 이름 매칭 실패 시 기록을 만들지 않고, 응답 ID가 이미 있으면 `duplicate`, 새 응답이면 학생별 `records` 행과 import 추적 행을 같은 트랜잭션으로 저장한다.

### Task 3: Vercel 수신 API와 Google Apps Script

**Files:**
- Create: `api/google-form-record-import.ts`
- Create: `integrations/google-form-record-import/Code.gs`
- Create: `integrations/google-form-record-import/README.md`
- Modify: `.env.example`

- [x] API가 POST·Bearer 공유 비밀·서버 환경변수·payload를 검증하고 RPC 결과를 JSON으로 반환하게 한다.
- [x] Form-bound Apps Script가 신규 제출과 과거 응답을 모두 같은 payload로 전송하게 한다.
- [x] Vercel 환경변수, Supabase migration 적용, Script Properties 설정, 트리거 설치, 과거 응답 가져오기 순서를 README에 기록한다.

### Task 4: 검증

**Files:**
- Modify: `docs/superpowers/plans/2026-09-09-google-form-record-import.md`

- [x] 대상 Vitest, lint, production build, `git diff --check`을 실행한다.
- [x] 개발 완료 후 체크박스와 실제 운영 전 수동 설정 항목을 갱신한다.
