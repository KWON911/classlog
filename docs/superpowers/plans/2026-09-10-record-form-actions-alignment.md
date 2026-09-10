# 누가기록 폼 동작 버튼 정렬 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 누가기록 폼의 저장·취소 버튼을 박스 오른쪽에 정렬한다.

**Architecture:** `RecordForm`의 기존 버튼 컨테이너에 Tailwind의 주축 오른쪽 정렬 유틸리티만 추가한다. 제출·취소 콜백과 버튼 순서는 건드리지 않는다.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest

## Global Constraints

- 모든 화면 크기에서 오른쪽 정렬한다.
- 버튼 순서와 저장·취소 동작은 변경하지 않는다.
- 데이터 모델, Supabase 요청, 라우팅을 변경하지 않는다.

---

### Task 1: 폼 동작 버튼 오른쪽 정렬

**Files:**
- Modify: `src/components/RecordForm.tsx:65-72`
- Test: `src/components/RecordForm.test.tsx`

**Interfaces:**
- Consumes: `RecordForm`의 `submitLabel`, `onSubmit`, `onCancel` props
- Produces: 오른쪽에 함께 배치된 제출·취소 버튼 그룹

- [x] **Step 1: 동작 버튼 컨테이너의 오른쪽 정렬을 검증하는 실패 테스트를 작성한다.**

```tsx
expect(screen.getByRole('button', { name: '기록 저장' }).parentElement).toHaveClass('justify-end')
```

- [x] **Step 2: 대상 테스트가 `justify-end` 클래스가 없어 실패하는지 확인한다.**

Run: `npm test -- src/components/RecordForm.test.tsx`

Expected: FAIL — action container does not have `justify-end`.

- [x] **Step 3: 버튼 컨테이너에 오른쪽 정렬 클래스를 추가한다.**

```tsx
<div className="flex justify-end gap-2">
```

- [x] **Step 4: 대상 테스트가 통과하는지 확인한다.**

Run: `npm test -- src/components/RecordForm.test.tsx`

Expected: PASS.

- [x] **Step 5: lint와 production build를 실행한다.**

Run: `npm run lint; npm run build`

Expected: both commands exit 0.

- [x] **Step 6: 변경과 계획을 커밋한다.**

```bash
git add src/components/RecordForm.tsx src/components/RecordForm.test.tsx docs/superpowers/plans/2026-09-10-record-form-actions-alignment.md
git commit -m "style: align record form actions"
```
