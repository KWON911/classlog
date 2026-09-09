# 누가기록 카테고리 기본값 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 누가기록에서 선택한 카테고리를 새 기록 추가 폼의 기본 카테고리로 사용한다.

**Architecture:** `RecordTimeline`이 선택 필터 변경을 부모 콜백으로 알리고, `StudentDetailPage`가 선택 카테고리를 보관해 추가용 `RecordForm`의 `initialValues`로 전달한다. `all` 필터는 전달하지 않아 `RecordForm`의 기존 생활지도 기본값을 유지한다.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library.

## Global Constraints

- 특정 카테고리 필터만 새 기록 폼의 초기 카테고리로 사용한다.
- 전체 필터와 기록 수정 폼의 기존 기본값은 바꾸지 않는다.
- Supabase 훅 및 데이터 모델은 변경하지 않는다.

---

### Task 1: 필터 변경 알림

**Files:**
- Create: `src/components/RecordTimeline.test.tsx`
- Modify: `src/components/RecordTimeline.tsx`

**Interfaces:**
- Produces: optional `onFilterChange(filter: RecordCategory | 'all'): void` prop.

- [ ] **Step 1: 실패 테스트 작성**

```tsx
it('reports the selected category filter', async () => {
  const onFilterChange = vi.fn()
  render(<RecordTimeline records={[]} onEdit={vi.fn()} onDelete={vi.fn()} onFilterChange={onFilterChange} />)
  await userEvent.click(screen.getByRole('button', { name: '학습' }))
  expect(onFilterChange).toHaveBeenLastCalledWith('학습')
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- src/components/RecordTimeline.test.tsx`

Expected: `onFilterChange` prop type is missing.

- [ ] **Step 3: 최소 구현 작성**

카테고리 버튼의 filter state 변경 시 optional callback에 같은 값을 전달한다.

- [ ] **Step 4: 대상 테스트 통과 확인**

Run: `npm test -- src/components/RecordTimeline.test.tsx`

Expected: PASS.

### Task 2: 새 기록 폼 초기값 연결

**Files:**
- Modify: `src/routes/StudentDetailPage.tsx`
- Modify: `src/components/RecordTimeline.test.tsx`

**Interfaces:**
- Consumes: `onFilterChange` callback.
- Produces: 선택 필터를 새 기록용 `RecordForm.initialValues.category`로 전달하는 상세 페이지.

- [ ] **Step 1: 통합 실패 테스트 작성**

`StudentDetailPage`를 모킹한 학생·기록 훅과 함께 렌더하고, 학습 필터 선택 뒤 기록 추가를 클릭해 category select가 `학습`인지 검증한다.

- [ ] **Step 2: 실패 확인**

Run: `npm test -- src/routes/StudentDetailPage.test.tsx`

Expected: select value is `생활지도`.

- [ ] **Step 3: 최소 구현 작성**

`selectedRecordCategory` state를 추가하고 `all`일 때 `undefined`, 특정 카테고리일 때 `{ category }`를 추가 폼에 전달한다.

- [ ] **Step 4: 관련 테스트 통과 확인**

Run: `npm test -- src/components/RecordTimeline.test.tsx src/routes/StudentDetailPage.test.tsx`

Expected: PASS.

### Task 3: 검증

**Files:**
- Modify: none

- [ ] **Step 1: lint 및 build 실행**

Run: `npm run lint` then `npm run build`

Expected: both PASS.

- [ ] **Step 2: 커밋**

```bash
git add src/components/RecordTimeline.tsx src/components/RecordTimeline.test.tsx src/routes/StudentDetailPage.tsx src/routes/StudentDetailPage.test.tsx docs/superpowers/specs/2026-09-09-record-category-default-design.md docs/superpowers/plans/2026-09-09-record-category-default.md
git commit -m "feat: default new records to selected category"
```
