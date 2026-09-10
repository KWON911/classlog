# 학생 누적 출결 이력 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 누가기록 출결 통계에서 해당 학생·상태의 전체 출결 이력을 열고 복귀할 수 있게 한다.

**Architecture:** 새 훅이 한 학생·상태의 `attendance` 행을 최신순으로 가져온다. `AttendancePage`는 URL의 `view=history`, `student`, `status`를 해석해 이력 화면을 렌더링하며, `StudentDetailPage`는 양수 통계를 그 URL로 이동시키는 버튼으로 표시한다.

**Tech Stack:** React 19, TypeScript, React Router, Supabase, Vitest, Testing Library

## Global Constraints

- 통계와 이력 모두 전체 누적 기간을 기준으로 한다.
- 0건 통계는 클릭 불가 안내로 유지한다.
- Supabase SDK 직접 호출은 훅에서만 한다.
- 출결 저장·삭제·기존 일일·월간 화면은 변경하지 않는다.

---

### Task 1: 학생 상태별 누적 이력 조회 훅

**Files:**
- Create: `src/lib/hooks/useStudentAttendanceHistory.ts`
- Create: `src/lib/hooks/useStudentAttendanceHistory.test.ts`

**Interfaces:**
- Produces: `useStudentAttendanceHistory(studentId, status)` → `{ entries, loading, error }`
- Consumes: `studentId: string | undefined`, `status: AttendanceStatus | undefined`

- [ ] **Step 1: studentId·status로 최신순 조회하는 실패 테스트를 작성한다.**
- [ ] **Step 2: 테스트가 모듈 부재로 실패하는지 확인한다.**
- [ ] **Step 3: `attendance`에 `.eq('student_id', studentId).eq('status', status).order('date', { ascending: false })`를 적용하는 훅을 구현한다.**
- [ ] **Step 4: 훅 테스트 통과를 확인한다.**

### Task 2: URL 기반 이력 화면과 복귀 경로

**Files:**
- Create: `src/components/StudentAttendanceHistory.tsx`
- Modify: `src/routes/AttendancePage.tsx`
- Test: `src/routes/AttendancePage.test.tsx`

**Interfaces:**
- Consumes: URL `view=history&student=<id>&status=<AttendanceStatus>`, 학생 목록, 이력 훅 반환값
- Produces: 학생·상태·건수·최신순 이력과 `/students/<id>` 복귀 링크

- [ ] **Step 1: 유효한 이력 URL에서 복귀 링크와 이력 제목을 보이는 실패 테스트를 작성한다.**
- [ ] **Step 2: 테스트가 기존 일일 출결 화면을 보여 실패하는지 확인한다.**
- [ ] **Step 3: URL 파싱·상태 검증 후 이력 컴포넌트를 렌더링한다.**
- [ ] **Step 4: 대상 테스트 통과를 확인한다.**

### Task 3: 누가기록 출결 통계 딥링크

**Files:**
- Modify: `src/routes/StudentDetailPage.tsx`
- Modify: `src/routes/StudentDetailPage.test.tsx`

**Interfaces:**
- Consumes: `attendanceSummary: Record<AttendanceStatus, number>`, 현재 학생 ID
- Produces: 양수 통계의 `/attendance?view=history&student=<id>&status=<status>` 이동 버튼

- [ ] **Step 1: 양수 통계를 클릭하면 이력 URL로 이동하고 0건은 버튼이 아닌 실패 테스트를 작성한다.**
- [ ] **Step 2: 테스트가 현재 span 통계 때문에 실패하는지 확인한다.**
- [ ] **Step 3: 양수 통계만 접근 가능한 버튼으로 바꾸고 navigate를 호출한다.**
- [ ] **Step 4: 대상 테스트 통과를 확인한다.**
- [ ] **Step 5: 전체 테스트, lint, production build를 실행한다.**
- [ ] **Step 6: 변경과 계획을 커밋한다.**
