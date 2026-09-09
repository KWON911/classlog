# 정보관리 학생목록 밀도 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 정보관리 학생목록의 데스크톱 행과 헤더 여백을 압축해 한 화면에 더 많은 학생을 표시한다.

**Architecture:** `StudentListCard`의 기존 CSS grid와 상태·메뉴 구조를 유지한다. 반응형 클래스만 조정해 데스크톱은 압축하고, 모바일의 터치 목표 크기는 그대로 둔다.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Vitest.

## Global Constraints

- 학생 CRUD·CSV·상세 모달·관리 메뉴 동작을 변경하지 않는다.
- 모바일 행 높이와 관리 메뉴 버튼의 터치 크기를 줄이지 않는다.
- 데스크톱 행 높이는 44px로 조정한다.

---

### Task 1: 압축형 목록 레이아웃

**Files:**
- Modify: `src/components/manage/StudentListCard.tsx`
- Test: `src/components/manage/StudentListCard.test.tsx`

**Interfaces:**
- Consumes: 기존 `StudentListCardProps`.
- Produces: 동일한 props와 CRUD 동작을 유지하는 더 조밀한 데스크톱 명단.

- [ ] **Step 1: 목록 제어와 행을 검증하는 실패 테스트 작성**

```tsx
render(<StudentListCard {...propsWithStudents} />)
expect(screen.getByText('학생 정보')).toBeInTheDocument()
expect(screen.getByText('1')).toBeInTheDocument()
expect(screen.getByText('김민서')).toBeInTheDocument()
```

- [ ] **Step 2: 대상 테스트 실행**

Run: `npm test -- src/components/manage/StudentListCard.test.tsx`

Expected: 현재 컴포넌트 테스트가 없어 import resolution fails.

- [ ] **Step 3: 최소 CSS 레이아웃 수정**

`StudentListCard`의 헤더를 데스크톱 한 줄 우선으로 만들고, `ROW_GRID_CLASS`를 `sm:grid-cols-[52px_minmax(120px,1fr)_64px_36px]`로 수정한다. 목록 행에 `sm:h-11`을 적용하고 모바일 `h-[52px]`는 유지한다.

- [ ] **Step 4: 대상 테스트 재실행**

Run: `npm test -- src/components/manage/StudentListCard.test.tsx`

Expected: PASS.

### Task 2: 검증

**Files:**
- Modify: none

- [ ] **Step 1: 관련 테스트, lint, build 실행**

Run: `npm test -- src/components/manage/StudentListCard.test.tsx`, `npm run lint`, `npm run build`

Expected: all PASS.

- [ ] **Step 2: 커밋**

```bash
git add src/components/manage/StudentListCard.tsx src/components/manage/StudentListCard.test.tsx docs/superpowers/specs/2026-09-09-student-list-density-design.md docs/superpowers/plans/2026-09-09-student-list-density.md
git commit -m "feat: compact student management list"
```
