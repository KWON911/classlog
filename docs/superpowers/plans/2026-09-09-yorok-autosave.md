# 학급요록 자동저장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학급요록 셀 편집 내용을 800ms 디바운스 후 변경된 학생 행 단위로 자동 저장한다.

**Architecture:** `YorokTable` 내부의 draft/dirty 상태를 유지하면서, 저장 시작 시 변경 ID와 values 스냅샷을 분리한다. 성공한 스냅샷만 dirty 상태에서 제거해 저장 중 새 편집을 보존하며, 실패한 ID는 다음 자동 또는 수동 저장에서 재시도한다.

**Tech Stack:** React 19, TypeScript, Vitest, existing `useYorokEntries` Supabase hook.

## Global Constraints

- 저장 데이터 접근은 기존 `useYorokEntries.saveEntryValues`만 사용한다.
- 텍스트 및 체크박스 입력 뒤 800ms 동안 변경이 없을 때만 자동 저장한다.
- 기존 컬럼 관리 기능과 JSONB 값 구조를 변경하지 않는다.
- 저장 실패 시 draft 입력값을 삭제하지 않는다.

---

### Task 1: 자동저장 상태 전이 순수 로직

**Files:**
- Create: `src/lib/yorokAutosave.ts`
- Test: `src/lib/yorokAutosave.test.ts`

**Interfaces:**
- Produces: `removeSavedDirtyIds(dirtyIds, savedIds, changedDuringSaveIds): Set<string>` — 저장에 성공한 ID 중 저장 도중 다시 수정되지 않은 ID만 dirty 상태에서 제거한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
it('keeps a student dirty when that student changed while saving', () => {
  expect(removeSavedDirtyIds(new Set(['s1', 's2']), new Set(['s1', 's2']), new Set(['s1']))).toEqual(new Set(['s1']))
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- src/lib/yorokAutosave.test.ts`

Expected: `removeSavedDirtyIds` export is missing.

- [ ] **Step 3: 최소 구현 작성**

```ts
export function removeSavedDirtyIds(
  dirtyIds: Set<string>,
  savedIds: Set<string>,
  changedDuringSaveIds: Set<string>,
) {
  return new Set([...dirtyIds].filter((id) => !savedIds.has(id) || changedDuringSaveIds.has(id)))
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/lib/yorokAutosave.test.ts`

Expected: PASS.

### Task 2: 학급요록 자동저장 연결

**Files:**
- Modify: `src/components/yorok/YorokTable.tsx`
- Modify: `src/lib/yorokAutosave.test.ts`

**Interfaces:**
- Consumes: `removeSavedDirtyIds` from `src/lib/yorokAutosave.ts`.
- Produces: 자동 저장 상태를 표시하고, 수동 저장이 대기 타이머를 즉시 대체하는 학급요록 UI.

- [ ] **Step 1: 기존 로직만으로 재현되는 실패 테스트 확장**

```ts
it('removes all successfully saved students that did not change during save', () => {
  expect(removeSavedDirtyIds(new Set(['s1', 's2']), new Set(['s1']), new Set())).toEqual(new Set(['s2']))
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- src/lib/yorokAutosave.test.ts`

Expected: test fails until the helper preserves unsaved IDs correctly.

- [ ] **Step 3: `YorokTable`에 800ms 타이머 및 저장 스냅샷 연결**

`handleSave`가 optional 자동/수동 표시 문맥을 받고, 저장 시작 시 `dirtyIds`와 draft를 스냅샷으로 캡처한다. 타이머는 draft/dirty 변경마다 재설정하고 unmount 및 수동 저장 시작 시 취소한다. 성공 ID는 helper를 통해 제거하고 실패 ID는 남긴다.

- [ ] **Step 4: 대상 테스트 통과 확인**

Run: `npm test -- src/lib/yorokAutosave.test.ts`

Expected: PASS.

### Task 3: 전체 검증

**Files:**
- Modify: none

**Interfaces:**
- Consumes: completed Tasks 1–2.
- Produces: verified build artifacts only.

- [ ] **Step 1: 관련 훅 및 새 로직 테스트 실행**

Run: `npm test -- src/lib/yorokAutosave.test.ts src/lib/hooks/useYorokEntries.test.ts`

Expected: PASS.

- [ ] **Step 2: 전체 테스트 실행**

Run: `npm test`

Expected: PASS.

- [ ] **Step 3: lint와 production build 실행**

Run: `npm run lint` then `npm run build`

Expected: both PASS.

- [ ] **Step 4: 커밋**

```bash
git add src/lib/yorokAutosave.ts src/lib/yorokAutosave.test.ts src/components/yorok/YorokTable.tsx docs/superpowers/specs/2026-09-09-yorok-autosave-design.md docs/superpowers/plans/2026-09-09-yorok-autosave.md
git commit -m "feat: autosave yorok changes"
```
