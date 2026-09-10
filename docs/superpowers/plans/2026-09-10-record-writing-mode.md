# 누가기록 작성 모드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 누가기록 작성 중 상단 추가 버튼의 혼동을 없애고, 저장 동작을 명확하게 표시한다.

**Architecture:** `StudentDetailPage`가 기존 `showRecordForm` 상태에 따라 상단 제어 영역을 렌더링한다. `RecordForm`은 기존 `submitLabel` 인터페이스를 그대로 사용해 작성 모드의 제출 문구만 `기록 저장`으로 받는다. 데이터 훅과 저장 흐름은 변경하지 않는다.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Tailwind CSS

## Global Constraints

- 학생별 한 건 작성 흐름만 바꾸며 데이터 모델·Supabase 요청·라우팅은 변경하지 않는다.
- 작성 중 실제 동작 버튼은 폼의 `기록 저장`과 `취소`만 유지한다.
- 선택한 타임라인 카테고리의 기본값 전달을 유지한다.
- 접근성 안내는 클릭 가능한 버튼으로 구현하지 않는다.

---

### Task 1: 작성 모드 상단 상태와 저장 문구

**Files:**
- Modify: `src/routes/StudentDetailPage.tsx:113-160`
- Test: `src/routes/StudentDetailPage.test.tsx`

**Interfaces:**
- Consumes: `showRecordForm: boolean`, `RecordForm`의 `submitLabel`, `onCancel`
- Produces: 폼이 열려 있는 동안 `기록 작성 중` 안내와 `기록 저장` 제출 버튼을 렌더링하는 학생 상세 화면

- [x] **Step 1: 작성 모드 UI의 실패 테스트를 작성한다.**

```tsx
it('shows a writing status and a save action while a new record form is open', () => {
  renderStudentDetail()
  fireEvent.click(screen.getByRole('button', { name: '기록 추가' }))

  expect(screen.queryByRole('button', { name: '기록 추가' })).not.toBeInTheDocument()
  expect(screen.getByText('기록 작성 중')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '기록 저장' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument()
})
```

- [x] **Step 2: 대상 테스트가 현재 `기록 추가` 버튼과 `추가` 제출 문구 때문에 실패하는지 확인한다.**

Run: `npm test -- src/routes/StudentDetailPage.test.tsx`

Expected: FAIL — `기록 추가` 버튼이 계속 존재하거나 `기록 저장` 버튼을 찾지 못함.

- [x] **Step 3: 최소 UI 변경을 구현한다.**

```tsx
{showRecordForm ? (
  <span className="..." role="status">기록 작성 중</span>
) : (
  <button type="button" onClick={openRecordForm} className="...">
    <Plus size={16} />
    기록 추가
  </button>
)}

<RecordForm submitLabel="기록 저장" onSubmit={handleAddRecord} onCancel={() => setShowRecordForm(false)} />
```

- [x] **Step 4: 대상 테스트가 통과하고 기존 기본 카테고리·도움말 테스트도 유지되는지 확인한다.**

Run: `npm test -- src/routes/StudentDetailPage.test.tsx`

Expected: PASS.

- [x] **Step 5: lint와 production build를 실행한다.**

Run: `npm run lint; npm run build`

Expected: both commands exit 0.

- [x] **Step 6: 변경 파일과 계획을 커밋한다.**

```bash
git add src/routes/StudentDetailPage.tsx src/routes/StudentDetailPage.test.tsx docs/superpowers/plans/2026-09-10-record-writing-mode.md
git commit -m "fix: clarify record writing mode"
```
