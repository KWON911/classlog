# 출결관리 개인별 이력 탭 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학생 누가기록의 출결 정보를 출결관리의 개인별 이력 탭으로 이동한다.

**Architecture:** `AttendancePage`가 세 번째 탭과 URL 초기값을 관리하고, 확장된 이력 훅이 선택 학생의 전체 또는 상태별 행을 읽는다. 학생 상세에서는 출결 조회 자체를 제거한다.

**Tech Stack:** React 19, React Router, TypeScript, Supabase, Vitest, Testing Library

## Global Constraints

- 출결 데이터는 기존 `attendance` 테이블과 RLS 적용 훅을 통해서만 조회한다.
- 일일 출결, 월간 요약, 저장·수정·삭제 및 NEIS 일정 동작은 변경하지 않는다.
- 학생을 고르기 전에는 개인별 이력 조회를 실행하지 않는다.
- 학생 누가기록에는 출결 집계나 링크를 표시하지 않는다.

---

### Task 1: 선택 학생의 전체 또는 상태별 이력 조회

**Files:**
- Modify: `src/lib/hooks/useStudentAttendanceHistory.ts`
- Test: `src/lib/hooks/useStudentAttendanceHistory.test.ts`

**Interfaces:**
- Consumes: `studentId: string | undefined`, `status: AttendanceStatus | undefined`
- Produces: `{ entries, loading, error }`; `status`가 없으면 상태 전체를 최신순으로 반환한다.

- [x] **Step 1: 상태가 없는 호출이 상태 조건 없이 학생·날짜순 조회한다는 실패 테스트를 추가한다.**
- [x] **Step 2: `npm test -- useStudentAttendanceHistory`로 새 테스트가 기존 필수 상태 조건 때문에 실패하는지 확인한다.**
- [x] **Step 3: 상태가 있을 때만 `.eq('status', status)`를 적용하는 최소 구현으로 바꾼다.**
- [x] **Step 4: `npm test -- useStudentAttendanceHistory`로 통과를 확인한다.**

### Task 2: 출결관리 개인별 이력 탭

**Files:**
- Modify: `src/components/StudentAttendanceHistory.tsx`
- Modify: `src/routes/AttendancePage.tsx`
- Create: `src/routes/AttendancePage.test.tsx`

**Interfaces:**
- Consumes: 선택 학생, 선택 상태 또는 `undefined`, 이력 훅 반환값
- Produces: `개인별 이력` 탭의 학생 선택, 상태 필터, 전체 기간 최신순 이력 목록

- [x] **Step 1: 개인별 이력 탭에서 학생 선택 전 안내가 보이고, 학생·상태를 선택하면 목록이 보인다는 실패 라우트 테스트를 작성한다.**
- [x] **Step 2: `npm test -- AttendancePage`로 탭이 없어 실패하는지 확인한다.**
- [x] **Step 3: 세 번째 탭, 학생·상태 선택 UI, 레거시 URL 초기값 및 목록 렌더링을 최소 구현한다.**
- [x] **Step 4: `npm test -- AttendancePage`로 통과를 확인한다.**

### Task 3: 학생 누가기록에서 출결 정보 제거

**Files:**
- Modify: `src/routes/StudentDetailPage.tsx`
- Modify: `src/routes/StudentDetailPage.test.tsx`

**Interfaces:**
- Produces: 생활기록/상담만 포함하는 학생 누가기록 화면

- [x] **Step 1: 출결 통계 텍스트가 보이지 않는 실패 테스트를 작성한다.**
- [x] **Step 2: `npm test -- StudentDetailPage`로 기존 배지 때문에 실패하는지 확인한다.**
- [x] **Step 3: 출결 요약 훅·타입·배지·오류 표시를 제거한다.**
- [x] **Step 4: `npm test -- StudentDetailPage`로 통과를 확인한다.**

### Task 4: 회귀 검증

**Files:**
- Modify: 앞선 작업 파일만

- [ ] **Step 1: `npm test`를 실행하고 실패한 테스트가 있으면 이번 변경 범위에서 수정한다.**
- [x] **Step 2: `npm run lint`를 실행한다.**
- [x] **Step 3: `npm run build`를 실행한다.**
