# 학급 공동 목표·정원 장식 해금 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 성장정원 상점 기록을 월별 학급 공동 목표로 파생해 장식을 자동 해금하고, 해금 장식을 정원·전체화면·리포트에 누적 표시한다.

**Architecture:** `growth_points`는 유일한 점수 원본으로 유지하고, 목표 설정과 영구 해금 이력만 신규 테이블에 저장한다. 순수 목표 로직은 월간 상점 합계·milestone 상태·유효성을 계산하고, service/hook이 Supabase 또는 mock 데이터를 동일한 shape으로 UI에 제공한다. SVG 장식은 학생 그리드보다 낮은 우선순위의 고정 슬롯 레이어에서 렌더링한다.

**Tech Stack:** React 19, TypeScript, Vitest, Framer Motion, Supabase/Postgres RLS, Vite

## Global Constraints

- 공동 목표 점수는 현재 교사의 현재 학생들의 해당 월 `merit` `amount` 합계만 사용하며, `demerit`과 개인 순위/기여도는 표시하지 않는다.
- `bulk` 기록도 포함하고, 기록 삭제·일괄 취소로 점수가 내려가도 해금 이력은 삭제하지 않는다.
- 목표는 교사별·연월별 한 건, milestone은 3~5개·양의 정수 오름차순·중복 장식 금지다.
- 해금 장식은 교사별 같은 `decoration_type`을 한 번만 해금하며, 외부 이미지 없이 SVG로 제공한다.
- UI에서 Supabase SDK를 직접 호출하지 않고, mock과 Supabase는 같은 `GrowthGardenService` 계약을 구현한다.
- migration은 추가 전용이며 RLS는 `teacher_id = auth.uid()` 소유권을 보장한다.
- `prefers-reduced-motion`, 키보드 접근성, 식물/이름 우선 시각 위계를 유지한다.

---

### Task 1: 도메인 타입·순수 공동 목표 로직

**Files:**
- Create: `src/lib/growth-garden/classGoal.ts`
- Create: `src/lib/growth-garden/classGoal.test.ts`
- Modify: `src/lib/types.ts`

**Interfaces:**
- Produces: `DecorationType`, `ClassGoal`, `ClassGoalMilestone`, `ClassGardenUnlock`, `validateClassGoalMilestones`, `classGoalScore`, `buildClassGoalProgress`.
- Consumes: `GrowthPointEntry`의 `student_id`, `type`, `amount`, `created_at` 및 로컬 월의 `[from, to)` 경계.

- [ ] **Step 1: 실패 테스트를 작성한다.**

```ts
it('현재 학생의 해당 월 merit와 bulk merit만 합산하고 demerit은 제외한다', () => {
  expect(classGoalScore(entries, new Set(['s1', 's2']), { year: 2026, month: 9 })).toBe(13)
})
it('milestone은 3~5개의 양의 정수 오름차순이며 장식이 중복되면 거부한다', () => {
  expect(validateClassGoalMilestones(duplicateMilestones)).toMatch(/중복/)
})
it('점수가 내려가도 저장된 해금은 잠그지 않고, 아직 해금되지 않은 도달 milestone만 반환한다', () => {
  expect(buildClassGoalProgress(goal, 198, existingUnlocks).unlockedMilestones).toHaveLength(1)
})
```

- [ ] **Step 2: 실패를 확인한다.**

Run: `npm test -- src/lib/growth-garden/classGoal.test.ts`

Expected: 신규 모듈/함수가 없어 실패한다.

- [ ] **Step 3: 최소 구현을 작성한다.**

```ts
export type DecorationType = 'stone_path' | 'bench' | 'pond' | 'birdhouse' | 'big_tree' | 'bridge' | 'fence' | 'garden_lamp'
export type ClassGoalMilestone = { point: number; decorationType: DecorationType }
export type ClassGoal = { id: string; teacher_id: string; year: number; month: number; target_point: number; milestones: ClassGoalMilestone[]; created_at: string; updated_at: string }
export type ClassGardenUnlock = { id: string; teacher_id: string; decoration_type: DecorationType; year: number; month: number; milestone_point: number; unlocked_at: string; created_at: string }
```

Use local-calendar month boundaries. `buildClassGoalProgress` must return score, target, next milestone, completion state, unlocked/locked milestones, and `newlyReachableMilestones`, excluding already unlocked decoration types.

- [ ] **Step 4: 단위 테스트를 통과시킨다.**

Run: `npm test -- src/lib/growth-garden/classGoal.test.ts`

Expected: PASS.

- [ ] **Step 5: 커밋한다.**

```bash
git add src/lib/types.ts src/lib/growth-garden/classGoal.ts src/lib/growth-garden/classGoal.test.ts
git commit -m "feat: add class goal domain logic"
```

### Task 2: 목표·해금 저장소와 안전한 migration

**Files:**
- Create: `supabase/migrations/20260902_class_garden_goals.sql`
- Modify: `src/lib/growth-garden/services/types.ts`
- Modify: `src/lib/growth-garden/services/supabaseGrowthGardenService.ts`
- Modify: `src/lib/growth-garden/services/mockGrowthGardenService.ts`
- Test: `src/lib/growth-garden/services/mockGrowthGardenService.test.ts`

**Interfaces:**
- Consumes: Task 1 types.
- Produces: `getClassGoal(year, month)`, `saveClassGoal(input)`, `listClassGardenUnlocks()`, `upsertClassGardenUnlocks(inputs)`.

- [ ] **Step 1: 서비스 실패 테스트를 작성한다.**

```ts
it('다른 달 목표를 덮어쓰지 않고 같은 장식의 해금을 한 행으로 유지한다', async () => {
  await service.saveClassGoal(septemberGoal)
  await service.saveClassGoal(octoberGoal)
  await service.upsertClassGardenUnlocks([pondUnlock, pondUnlock])
  expect((await service.getClassGoal(2026, 9)).data?.target_point).toBe(300)
  expect((await service.listClassGardenUnlocks()).data).toHaveLength(1)
})
```

- [ ] **Step 2: 실패를 확인한다.**

Run: `npm test -- src/lib/growth-garden/services/mockGrowthGardenService.test.ts`

Expected: service 메서드가 없어 실패한다.

- [ ] **Step 3: migration과 계약을 구현한다.**

```sql
create table if not exists class_goals (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) default auth.uid(),
  year integer not null check (year between 2000 and 2200),
  month integer not null check (month between 1 and 12),
  target_point integer not null check (target_point > 0),
  milestones jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, year, month)
);
```

Create `class_garden_unlocks` with unique `(teacher_id, decoration_type)` and `(teacher_id, year, month, milestone_point)`, indexes, and teacher-only RLS. Supabase must upsert on these conflict keys; mock must use dedicated validated localStorage keys.

- [ ] **Step 4: 서비스 테스트를 통과시킨다.**

Run: `npm test -- src/lib/growth-garden/services/mockGrowthGardenService.test.ts`

Expected: PASS.

- [ ] **Step 5: 커밋한다.**

```bash
git add supabase/migrations/20260902_class_garden_goals.sql src/lib/growth-garden/services
git commit -m "feat: persist class goals and unlocks"
```

### Task 3: 목표 상태 훅과 성장 기록 갱신 연동

**Files:**
- Create: `src/lib/hooks/useClassGardenGoal.ts`
- Create: `src/lib/hooks/useClassGardenGoal.test.ts`
- Modify: `src/lib/hooks/useGrowthGarden.ts`
- Modify: `src/lib/hooks/useGrowthGarden.bulk.test.ts`

**Interfaces:**
- Consumes: Task 1 progress helpers, Task 2 service methods, active `useStudents()` roster.
- Produces: `{ goal, progress, unlocks, loading, error, refresh, saveGoal }`.

- [ ] **Step 1: 훅 실패 테스트를 작성한다.**

```ts
it('25명 일괄 +1 뒤 도달 장식을 한 번만 해금한다', async () => {
  await result.current.addBulkPoints(studentIds, { type: 'merit', amount: 1, reason: '협동' })
  expect(mockUpsertClassGardenUnlocks).toHaveBeenCalledWith([expect.objectContaining({ decoration_type: 'stone_path' })])
})
it('일괄 취소 뒤 점수는 낮아져도 기존 unlock 목록은 유지한다', async () => {
  await result.current.deleteBatch(batchId)
  expect(result.current.goalProgress.score).toBe(95)
  expect(result.current.unlocks.map((item) => item.decoration_type)).toContain('stone_path')
})
```

- [ ] **Step 2: 실패를 확인한다.**

Run: `npm test -- src/lib/hooks/useClassGardenGoal.test.ts src/lib/hooks/useGrowthGarden.bulk.test.ts`

Expected: 공동 목표 훅/리프레시 연결이 없어 실패한다.

- [ ] **Step 3: 최소 훅을 구현한다.**

The hook loads the selected month goal and global unlocks, derives progress from entries and students, then idempotently upserts only `newlyReachableMilestones`. Existing record saves/deletes trigger refresh but never roll back a successful point record because unlock persistence failed.

- [ ] **Step 4: 훅 테스트를 통과시킨다.**

Run: `npm test -- src/lib/hooks/useClassGardenGoal.test.ts src/lib/hooks/useGrowthGarden.bulk.test.ts`

Expected: PASS.

- [ ] **Step 5: 커밋한다.**

```bash
git add src/lib/hooks/useClassGardenGoal.ts src/lib/hooks/useClassGardenGoal.test.ts src/lib/hooks/useGrowthGarden.ts src/lib/hooks/useGrowthGarden.bulk.test.ts
git commit -m "feat: derive class goal progress"
```

### Task 4: SVG 장식과 정원·전체화면 레이어

**Files:**
- Create: `src/components/growth-garden/GardenDecoration.tsx`
- Create: `src/components/growth-garden/GardenDecorationLayer.tsx`
- Create: `src/components/growth-garden/GardenDecorationLayer.test.tsx`
- Modify: `src/components/growth-garden/GardenView.tsx`
- Modify: `src/components/growth-garden/GrowthGardenBoard.tsx`

**Interfaces:**
- Consumes: Task 1 `DecorationType`, Task 3 unlocks/current-month progress.
- Produces: `GardenDecorationLayer({ unlocks, isFullscreen, newlyUnlockedTypes })`.

- [ ] **Step 1: 장식·고정 슬롯의 실패 테스트를 작성한다.**

```tsx
it('해금된 장식만 고정 슬롯에 그리고 연못·벤치·나무가 학생 그리드보다 낮은 레이어에 있다', () => {
  render(<GardenDecorationLayer unlocks={[pondUnlock, benchUnlock, treeUnlock]} isFullscreen={false} newlyUnlockedTypes={new Set()} />)
  expect(screen.getByLabelText('작은 연못')).toBeInTheDocument()
  expect(screen.queryByLabelText('정원등')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: 실패를 확인한다.**

Run: `npm test -- src/components/growth-garden/GardenDecorationLayer.test.tsx`

Expected: 장식 컴포넌트가 없어 실패한다.

- [ ] **Step 3: SVG와 레이어를 구현한다.**

Create SVG variants for stone path, bench, pond, birdhouse, big tree, bridge, fence, and garden lamp. Map each to deterministic percentage slots and bounded normal/fullscreen scale. Place it after `GardenBackground` and before the student grid. Animate only newly unlocked types with fade/scale; disable it for reduced motion.

- [ ] **Step 4: 장식 및 기존 정원 테스트를 통과시킨다.**

Run: `npm test -- src/components/growth-garden/GardenDecorationLayer.test.tsx src/components/growth-garden/GrowthGardenBoard.test.tsx`

Expected: PASS.

- [ ] **Step 5: 커밋한다.**

```bash
git add src/components/growth-garden/GardenDecoration.tsx src/components/growth-garden/GardenDecorationLayer.tsx src/components/growth-garden/GardenDecorationLayer.test.tsx src/components/growth-garden/GardenView.tsx src/components/growth-garden/GrowthGardenBoard.tsx
git commit -m "feat: render unlocked garden decorations"
```

### Task 5: 공동 목표 패널과 월별 설정 UI

**Files:**
- Create: `src/components/growth-garden/ClassGoalPanel.tsx`
- Create: `src/components/growth-garden/ClassGoalPanel.test.tsx`
- Create: `src/components/growth-garden/settings/ClassGoalEditor.tsx`
- Create: `src/components/growth-garden/settings/ClassGoalEditor.test.tsx`
- Modify: `src/components/growth-garden/GardenView.tsx`
- Modify: `src/routes/GrowthGardenSettingsPage.tsx`
- Modify: `src/routes/GrowthGardenSettingsPage.test.tsx`

**Interfaces:**
- Consumes: Task 1 validation and Task 3 state/save operations.
- Produces: no-goal, current/next/complete progress UI and a year/month-aware editor with 3–5 rows.

- [ ] **Step 1: 패널·저장 방지 실패 테스트를 작성한다.**

```tsx
it('다음 장식과 남은 점수, 완료 milestone을 표시한다', () => {
  render(<ClassGoalPanel goal={goal} progress={progressAt243} onOpenSettings={vi.fn()} />)
  expect(screen.getByText('57점 남았어요')).toBeInTheDocument()
  expect(screen.getByText('✓ 돌길')).toBeInTheDocument()
})
it('목표가 없으면 공동 목표 만들기를, 중복/비오름차순이면 저장 오류를 표시한다', async () => {
  render(<ClassGoalEditor initialGoal={null} onSave={onSave} />)
  await user.click(screen.getByRole('button', { name: '저장' }))
  expect(onSave).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: 실패를 확인한다.**

Run: `npm test -- src/components/growth-garden/ClassGoalPanel.test.tsx src/components/growth-garden/settings/ClassGoalEditor.test.tsx`

Expected: 컴포넌트가 없어 실패한다.

- [ ] **Step 3: 패널·에디터를 구현한다.**

Use semantic progressbar and text/icon milestone states; do not show student contributions. New months begin with a non-persisted 3-row draft, permit add to five and remove to three. Globally unlocked decoration choices are disabled; legacy saved choices remain visible. Reuse `GrowthFeedbackToast` for new unlock messaging and render compact score-only UI in fullscreen.

- [ ] **Step 4: UI 테스트를 통과시킨다.**

Run: `npm test -- src/components/growth-garden/ClassGoalPanel.test.tsx src/components/growth-garden/settings/ClassGoalEditor.test.tsx src/routes/GrowthGardenSettingsPage.test.tsx`

Expected: PASS.

- [ ] **Step 5: 커밋한다.**

```bash
git add src/components/growth-garden/ClassGoalPanel.tsx src/components/growth-garden/ClassGoalPanel.test.tsx src/components/growth-garden/settings/ClassGoalEditor.tsx src/components/growth-garden/settings/ClassGoalEditor.test.tsx src/components/growth-garden/GardenView.tsx src/routes/GrowthGardenSettingsPage.tsx src/routes/GrowthGardenSettingsPage.test.tsx
git commit -m "feat: configure and display class goals"
```

### Task 6: 월별 학급 리포트 연동과 전체 검증

**Files:**
- Create: `src/components/growth-garden/report/ClassGoalMonthlyReport.tsx`
- Create: `src/components/growth-garden/report/ClassGoalMonthlyReport.test.tsx`
- Modify: `src/routes/GrowthGardenReportPage.tsx`
- Modify: `src/routes/GrowthGardenReportPage.test.tsx`

**Interfaces:**
- Consumes: Task 3 selected-month goal/progress/unlocks.
- Produces: 과거 월의 목표, 최종 점수, 해당 월 해금, 미달성 milestone 보조 섹션.

- [ ] **Step 1: 과거 월 리포트 실패 테스트를 작성한다.**

```tsx
it('2026년 9월 리포트에서 9월 목표와 그 달 해금만 표시한다', () => {
  render(<ClassGoalMonthlyReport goal={septemberGoal} progress={septemberProgress} monthlyUnlocks={[pondUnlock]} />)
  expect(screen.getByText('9월 우리 반 공동 목표')).toBeInTheDocument()
  expect(screen.getByText('✓ 작은 연못')).toBeInTheDocument()
  expect(screen.getByText('○ 큰 나무')).toBeInTheDocument()
})
```

- [ ] **Step 2: 실패를 확인한다.**

Run: `npm test -- src/components/growth-garden/report/ClassGoalMonthlyReport.test.tsx src/routes/GrowthGardenReportPage.test.tsx`

Expected: 리포트 컴포넌트/연결이 없어 실패한다.

- [ ] **Step 3: 리포트 섹션을 구현한다.**

Render only in the class tab. Load selected report month independently from current month, derive that month’s merit score, and filter unlocks by unlock row year/month. Do not render any student contribution, ranking, or demerit details.

- [ ] **Step 4: 회귀 검증을 실행한다.**

Run: `npm test && npm run lint && npm run build`

Expected: 0 test failures, lint exit 0, production build exit 0. Manually smoke-check individual merit, 25-student bulk merit, batch cancellation, score drop after unlock, next-month reset with accumulated decorations, past-month report, fullscreen, and reduced motion.

- [ ] **Step 5: 커밋한다.**

```bash
git add src/components/growth-garden/report/ClassGoalMonthlyReport.tsx src/components/growth-garden/report/ClassGoalMonthlyReport.test.tsx src/routes/GrowthGardenReportPage.tsx src/routes/GrowthGardenReportPage.test.tsx
git commit -m "feat: report monthly class goal results"
```

## Plan Self-Review

- Spec coverage: Tasks 1–3 cover derived merit scoring, monthly isolation, permanent unlocks, bulk/cancel behavior, service boundary, and RLS. Tasks 4–5 cover SVGs, responsive/fullscreen presentation, animation/accessibility, guidance, and goal configuration. Task 6 covers historic monthly reports and full regression validation.
- Placeholder scan: No TBD/TODO or unspecified steps remain; every task has a concrete test, command, implementation boundary, and commit scope.
- Type consistency: `DecorationType`, `ClassGoal`, `ClassGoalMilestone`, and `ClassGardenUnlock` originate in Task 1 and are consumed consistently by storage, hooks, UI, settings, and reports.

