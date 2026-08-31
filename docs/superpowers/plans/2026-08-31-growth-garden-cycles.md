# 반복 성장 사이클 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 꽃 피움 이후 결실과 성장 완료를 거쳐 새 씨앗으로 반복 성장하고, 완료한 꽃을 학생별 도감으로 보존한다.

**Architecture:** growth_points의 누적 점수는 기존처럼 유일한 점수 source of truth로 유지한다. 순수 plantCycle 모듈이 누적 점수를 현재 사이클·단계·결정적 꽃으로 변환하고, plant_cycles는 완료한 사이클의 꽃·완료 시점·당시 완료 기준만 확정 이력으로 저장한다. useGrowthGarden은 서비스 계층으로 누락 이력을 idempotent하게 보정한 뒤 모든 화면에 동일한 사이클 요약을 제공한다.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Tailwind CSS v4, Supabase, existing growth-garden service layer and SVG components.

## Global Constraints

- growth_points, 기존 상벌점 기록, 누적 성장점수, 월간 성장순 계산식은 변경하거나 초기화하지 않는다.
- 새 기본 개인 단계는 기존 꽃 피움 기준 뒤에 +5, +10, +15, +20으로 확장하고, 모든 기준은 GrowthSettings에서 수정 가능해야 한다.
- Supabase는 서비스 계층에서만 호출하고, migration은 추가 전용·RLS·소유권 검증·고유 제약을 사용한다.
- 꽃은 학생·교사가 선택하지 않으며 렌더 중 Math.random()을 호출하지 않는다.
- 현재 사이클 꽃은 모든 화면에서 같고, 완료 이력은 설정 변경 뒤에도 삭제·변경하지 않는다.
- 카드에는 무거운 개별 자연 애니메이션을 넣지 않는다. 정원 보기·학생 상세에서만 생명체 방문을 은은하게 강조한다.
- prefers-reduced-motion, 키보드 포커스, 기존 모바일·전체화면 레이아웃을 보존한다.

---

## File structure

- Create: src/lib/growth-garden/plantCycle.ts — 누적 점수, 단계표, 완료 이력으로 현재 사이클·보정 후보를 계산하는 순수 모듈.
- Create: src/lib/growth-garden/plantCycle.test.ts — 경계 점수, 고점 기존 학생, 벌점, 이력 보정을 검증.
- Create: src/components/growth-garden/FlowerCollection.tsx — 상세 화면의 확정 꽃 도감과 현재 식물 요약.
- Create: supabase/migrations/20260831_plant_cycles.sql — plant_cycles, RLS, 고유 제약.
- Modify: constants.ts, growth.ts, growthSettings.ts, flowers.ts — 11단계 설정, 사이클 호환 계산, 사이클별 꽃 배정.
- Modify: types.ts, services/types.ts, services 구현체, useGrowthGarden.ts — 완료 이력 타입·계약·동기화.
- Modify: PlantIllustration.tsx, GardenStudentCard.tsx, GardenPlot.tsx, StageProgressBar.tsx, GrowthFeedbackToast.tsx — 결실 SVG와 현재 사이클 표시.
- Modify: GrowthGardenBoard.tsx, GardenView.tsx, GrowthGardenStudentPage.tsx — 현재 사이클 및 도감 전달.
- Modify: monthlyReport.ts, StudentMonthlyReportView.tsx, MonthlyAwardCelebration.tsx — 리포트 전환과 축하 대표 꽃.

### Task 1: 순수 반복 사이클과 꽃 배정

**Files:**
- Create: src/lib/growth-garden/plantCycle.ts
- Create: src/lib/growth-garden/plantCycle.test.ts
- Modify: src/lib/growth-garden/constants.ts
- Modify: src/lib/growth-garden/growth.ts
- Modify: src/lib/growth-garden/flowers.ts
- Modify: src/lib/growth-garden/flowers.test.ts

**Interfaces:**
- Produces: PlantCycleSummary, plantCycleForScore(studentId, score, stages), backfillPlantCycles(studentId, entries, existing, stages), flowerForCycle(studentId, cycleNumber).
- Consumes: GrowthPointEntry, GrowthStageConfig, FlowerType.

- [ ] **Step 1: Write the failing tests**

~~~ts
it('45점에서 첫 사이클을 완료하고 두 번째 씨앗을 시작한다', () => {
  expect(plantCycleForScore('student-a', 45, GROWTH_STAGES)).toMatchObject({
    completedCycles: 1, currentCycleNumber: 2, currentCyclePoint: 0, currentStage: 0,
  })
})

it('92점과 완료 기준 45점은 완료 2회·세 번째 식물 2점이다', () => {
  expect(plantCycleForScore('student-a', 92, GROWTH_STAGES)).toMatchObject({
    completedCycles: 2, currentCycleNumber: 3, currentCyclePoint: 2,
  })
})

it('연속 사이클에 같은 꽃을 배정하지 않는다', () => {
  expect(flowerForCycle('student-a', 2)).not.toBe(flowerForCycle('student-a', 1))
})
~~~

- [ ] **Step 2: Run the focused tests and verify failure**

Run: npm test -- plantCycle flowers

Expected: FAIL because plantCycleForScore and flowerForCycle do not exist.

- [ ] **Step 3: Implement the pure domain API**

~~~ts
export type PlantCycleSummary = {
  totalGrowthPoint: number
  completionThreshold: number
  completedCycles: number
  currentCycleNumber: number
  currentCyclePoint: number
  currentStage: GrowthStage
  currentFlowerType: FlowerType
}

export function plantCycleForScore(studentId: string, score: number, stages: StageTable): PlantCycleSummary {
  const completionThreshold = stages.at(-1)?.minScore ?? 1
  const totalGrowthPoint = Math.max(0, score)
  const completedCycles = Math.floor(totalGrowthPoint / completionThreshold)
  const currentCyclePoint = totalGrowthPoint % completionThreshold
  return {
    totalGrowthPoint, completionThreshold, completedCycles,
    currentCycleNumber: completedCycles + 1,
    currentCyclePoint,
    currentStage: stageForScore(currentCyclePoint, stages),
    currentFlowerType: flowerForCycle(studentId, completedCycles + 1),
  }
}
~~~

Extend GrowthStage through 10 and append stages 7~10 in constants. flowerForCycle(studentId, 1) must return the existing flowerForStudent result. For later cycles hash student ID plus cycle number; when its result equals the previous cycle flower, advance one FLOWER_TYPES slot.

- [ ] **Step 4: Implement deterministic completion candidates and verify**

~~~ts
export function backfillPlantCycles(
  studentId: string,
  entries: GrowthPointEntry[],
  existing: PlantCycle[],
  stages: StageTable,
): NewPlantCycle[]
~~~

Sort a student's entries oldest-first. After each entry calculate clamped cumulative score and assign the first record crossing every missing completion multiple as completed_at. Return only missing cycle numbers from 1 through floor(total/threshold), with flowerForCycle and the current threshold. Run: npm test -- plantCycle flowers growth.

- [ ] **Step 5: Commit**

~~~bash
git add src/lib/growth-garden/constants.ts src/lib/growth-garden/growth.ts src/lib/growth-garden/flowers.ts src/lib/growth-garden/flowers.test.ts src/lib/growth-garden/plantCycle.ts src/lib/growth-garden/plantCycle.test.ts
git commit -m "feat: add plant growth cycle domain"
~~~

### Task 2: 11단계 설정 호환성과 완료 이력 저장소

**Files:**
- Create: supabase/migrations/20260831_plant_cycles.sql
- Modify: src/lib/types.ts
- Modify: src/lib/growth-garden/growthSettings.ts
- Modify: src/lib/growth-garden/growthSettings.test.ts
- Modify: src/lib/growth-garden/services/types.ts
- Modify: src/lib/growth-garden/services/supabaseGrowthGardenService.ts
- Modify: src/lib/growth-garden/services/mockGrowthGardenService.ts
- Modify: src/lib/growth-garden/services/index.ts

**Interfaces:**
- Produces: PlantCycle, NewPlantCycle, GrowthGardenService.listPlantCycles(), GrowthGardenService.upsertPlantCycles(inputs).
- Consumes: backfillPlantCycles from Task 1.

- [ ] **Step 1: Write failing settings compatibility tests**

~~~ts
it('기존 7개 개인 설정 뒤에 꽃 피움 기준 기반 네 단계를 보완한다', () => {
  const result = resolveSettings({ personal: [0, 3, 6, 10, 15, 20, 28], garden: DEFAULT_GARDEN_THRESHOLDS })
  expect(result.personal).toEqual([0, 3, 6, 10, 15, 20, 28, 33, 38, 43, 48])
})

it('11개 개인 기준은 모두 오름차순이어야 한다', () => {
  expect(validateThresholds([0, 3, 6, 10, 15, 20, 25, 30, 35, 40, 40])).toContain('이전 단계보다 커야')
})
~~~

- [ ] **Step 2: Run and verify failure**

Run: npm test -- growthSettings

Expected: FAIL because old 7-value data is rejected and the new defaults are absent.

- [ ] **Step 3: Add types, migration, and settings fallback**

~~~sql
create table if not exists plant_cycles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) default auth.uid(),
  cycle_number integer not null check (cycle_number > 0),
  flower_type text not null check (flower_type in ('tulip','sunflower','daisy','cosmos','rose','lily')),
  completed_at timestamptz not null,
  completion_threshold integer not null check (completion_threshold > 0),
  created_at timestamptz not null default now(),
  unique (teacher_id, student_id, cycle_number)
);
~~~

Enable RLS and add the same teacher-plus-student ownership policy as growth_points. Add PlantCycle to types.ts. Accept a 7-value stored personal array by retaining it and deriving its four trailing values from index 6; keep exact-length validation for every other malformed array.

~~~ts
export type PlantCycle = {
  id: string
  teacher_id: string
  student_id: string
  cycle_number: number
  flower_type: FlowerType
  completed_at: string
  completion_threshold: number
  created_at: string
}

export type NewPlantCycle = Pick<PlantCycle, 'student_id' | 'cycle_number' | 'flower_type' | 'completed_at' | 'completion_threshold'>

listPlantCycles(): Promise<{ data?: PlantCycle[]; error?: string }>
upsertPlantCycles(inputs: NewPlantCycle[]): Promise<{ data?: PlantCycle[]; error?: string }>
~~~

- [ ] **Step 4: Implement both service implementations and verify**

Supabase must use one upsert with onConflict teacher_id,student_id,cycle_number and ignoreDuplicates true, then return the teacher-scoped list. Mock must persist classlog:growth-garden:plant-cycles and merge by student_id plus cycle_number without overwriting an existing row. Run: npm test -- growthSettings plantCycle.

- [ ] **Step 5: Commit**

~~~bash
git add supabase/migrations/20260831_plant_cycles.sql src/lib/types.ts src/lib/growth-garden/growthSettings.ts src/lib/growth-garden/growthSettings.test.ts src/lib/growth-garden/services/types.ts src/lib/growth-garden/services/supabaseGrowthGardenService.ts src/lib/growth-garden/services/mockGrowthGardenService.ts src/lib/growth-garden/services/index.ts
git commit -m "feat: persist completed plant cycles"
~~~

### Task 3: 훅에서 완료 이력 보정과 사이클 요약 제공

**Files:**
- Modify: src/lib/hooks/useGrowthGarden.ts
- Create: src/lib/hooks/useGrowthGarden.cycles.test.ts
- Modify: src/lib/hooks/useGrowthGarden.bulk.test.ts

**Interfaces:**
- Consumes: plantCycleForScore, backfillPlantCycles, listPlantCycles, upsertPlantCycles.
- Produces: cycleFor(studentId), cyclesFor(studentId), latestCompletedCycleFor(studentId).

- [ ] **Step 1: Write the failing hook test**

~~~ts
it('기존 92점 학생의 누락 완료 이력 두 건을 한 번만 보정한다', async () => {
  mockListEntries.mockResolvedValue({ data: entriesWorth(92, 'student-a') })
  mockListPlantCycles.mockResolvedValue({ data: [] })
  renderHook(() => useGrowthGarden(), { wrapper: GrowthSettingsProvider })
  await waitFor(() => expect(mockUpsertPlantCycles).toHaveBeenCalledWith(expect.arrayContaining([
    expect.objectContaining({ student_id: 'student-a', cycle_number: 1 }),
    expect.objectContaining({ student_id: 'student-a', cycle_number: 2 }),
  ])))
})
~~~

- [ ] **Step 2: Run and verify failure**

Run: npm test -- useGrowthGarden.cycles

Expected: FAIL because the hook has no cycle state or cycle summary API.

- [ ] **Step 3: Load, merge, and idempotently backfill**

Load entries and cycles together in fetch. Once entries, settings, and cycles are ready, calculate missing rows for all student IDs represented in entries and call upsertPlantCycles once. Merge returned rows by student_id plus cycle_number; never mutate entries or issue one request per student.

~~~ts
const cycleFor = useCallback(
  (studentId: string) => plantCycleForScore(studentId, summaryFor(studentId).score, personalStages),
  [personalStages, summaryFor],
)
~~~

Keep individual and bulk inserts unchanged. The synchronization effect observes their updated entries and makes a single idempotent upsert.

- [ ] **Step 4: Verify edge cases**

Test a 45th-point insert creates one cycle, a bulk insert makes one cycle upsert covering all crossed students, deleting merit can lower currentStage without deleting stored rows, and changing threshold never overwrites stored flower_type. Run: npm test -- useGrowthGarden growthSettings plantCycle.

- [ ] **Step 5: Commit**

~~~bash
git add src/lib/hooks/useGrowthGarden.ts src/lib/hooks/useGrowthGarden.bulk.test.ts src/lib/hooks/useGrowthGarden.cycles.test.ts
git commit -m "feat: expose synchronized plant cycles"
~~~

### Task 4: 꽃 이후 Plant SVG와 진행 피드백

**Files:**
- Modify: src/components/growth-garden/PlantIllustration.tsx
- Modify: src/components/growth-garden/PlantIllustration.test.tsx
- Modify: src/components/growth-garden/StageProgressBar.tsx
- Modify: src/components/growth-garden/GrowthFeedbackToast.tsx

**Interfaces:**
- Consumes: PlantCycleSummary.currentStage and currentFlowerType.
- Produces: PlantIllustration props flowerType?: FlowerType and showVisitor?: boolean.

- [ ] **Step 1: Write failing illustration tests**

~~~tsx
it.each(['tulip', 'sunflower', 'daisy', 'cosmos', 'rose', 'lily'] as const)('%s 결실을 표시한다', (flowerType) => {
  render(<PlantIllustration stage={8} flowerType={flowerType} />)
  expect(screen.getByTestId('fruit-' + flowerType)).toBeInTheDocument()
})

it('생명체 방문은 요청된 식물에만 표시한다', () => {
  const view = render(<PlantIllustration stage={7} flowerType="daisy" showVisitor />)
  expect(screen.getByTestId('plant-visitor')).toBeInTheDocument()
  view.rerender(<PlantIllustration stage={7} flowerType="daisy" />)
  expect(screen.queryByTestId('plant-visitor')).not.toBeInTheDocument()
})
~~~

- [ ] **Step 2: Run and verify failure**

Run: npm test -- PlantIllustration

Expected: FAIL because post-bloom stages and visitor props are absent.

- [ ] **Step 3: Implement SVG evolution**

Keep stages 0~5 unchanged. Stages 6~9 all render FinalFlower; explicit flowerType overrides studentId-derived type. Add FruitCluster with stable test IDs: sunflower center seeds, rose hips, tulip/lily pods, daisy/cosmos seed heads. Stage 9 adds extra fruit and leaf parts rather than global scale. Stage 7+ gets subtle sway; showVisitor adds one small butterfly or bee that reuses Butterfly wing/colors and becomes static under reduced motion.

- [ ] **Step 4: Update progress and complete feedback**

Use current-cycle StageProgress. The exact completion boundary renders next cycle seed, while GrowthFeedbackToast supports tone complete and the copy: 한 번의 성장을 완성했어요! 새로운 씨앗을 발견했어요. Run: npm test -- PlantIllustration plantCycle.

- [ ] **Step 5: Commit**

~~~bash
git add src/components/growth-garden/PlantIllustration.tsx src/components/growth-garden/PlantIllustration.test.tsx src/components/growth-garden/StageProgressBar.tsx src/components/growth-garden/GrowthFeedbackToast.tsx
git commit -m "feat: show post-bloom plant stages"
~~~

### Task 5: 카드·정원·학생 상세의 현재 사이클과 꽃 도감

**Files:**
- Create: src/components/growth-garden/FlowerCollection.tsx
- Modify: src/components/growth-garden/GardenStudentCard.tsx
- Modify: src/components/growth-garden/GardenPlot.tsx
- Modify: src/components/growth-garden/GardenView.tsx
- Modify: src/components/growth-garden/GrowthGardenBoard.tsx
- Modify: src/routes/GrowthGardenStudentPage.tsx

**Interfaces:**
- Consumes: cycleFor, cyclesFor, latestCompletedCycleFor and PlantIllustration explicit flower props.
- Produces: cards and plots showing only current-cycle plant; detail page showing FlowerCollection.

- [ ] **Step 1: Write the focused collection test**

~~~tsx
it('도감에는 확정 꽃과 현재 진행 식물을 함께 표시한다', () => {
  render(<FlowerCollection studentName="하늘" completedCycles={[cycle(1, 'tulip'), cycle(2, 'rose')]} current={currentCycle(3, 12)} />)
  expect(screen.getByText('1번째 성장')).toBeInTheDocument()
  expect(screen.getByText('현재 진행 중')).toBeInTheDocument()
})
~~~

Use the repository's existing component-test location if a new component test file conflicts with its conventions; do not add a route-test framework.

- [ ] **Step 2: Run and verify failure**

Run: npm test -- FlowerCollection PlantIllustration

Expected: FAIL because FlowerCollection and cycle props do not exist.

- [ ] **Step 3: Pass current-cycle summaries through UI**

Replace plant stage and progress inputs with cycle.currentStage and cycle.currentCyclePoint. Keep total summary.score only when labelled 누적 성장 포인트 in the detail page. Cards show stage badge, n번째 식물, and next current-cycle stage remaining points. GardenPlot and large detail pass showVisitor when stage >= 7; cards do not. Preserve garden layout, selection behavior, and fullscreen behavior.

- [ ] **Step 4: Add the flower collection and smoke test**

FlowerCollection shows each stored PlantCycle in numeric order, using stage-6 PlantIllustration with flowerType and a Korean completion month. It shows a neutral bud before current stage 6 and current flower at/after stage 6. Detail shows total points, cycle number, current progress, completed count, and collection. Smoke-test card, garden, fullscreen, mobile card layout, individual point entry, and bulk point entry.

- [ ] **Step 5: Commit**

~~~bash
git add src/components/growth-garden/FlowerCollection.tsx src/components/growth-garden/GardenStudentCard.tsx src/components/growth-garden/GardenPlot.tsx src/components/growth-garden/GardenView.tsx src/components/growth-garden/GrowthGardenBoard.tsx src/routes/GrowthGardenStudentPage.tsx
git commit -m "feat: show current plant cycles and collection"
~~~

### Task 6: 월별 리포트와 수상 축하의 사이클 전환

**Files:**
- Modify: src/lib/growth-garden/monthlyReport.ts
- Modify: src/lib/growth-garden/monthlyReport.test.ts
- Modify: src/components/growth-garden/report/StudentMonthlyReportView.tsx
- Modify: src/components/growth-garden/awards/MonthlyAwardCelebration.tsx
- Modify: the existing report container that opens MonthlyAwardCelebration

**Interfaces:**
- Consumes: plantCycleForScore and latestCompletedCycleFor.
- Produces: StudentMonthlyReport.cycleStart, cycleEnd, cycleTransition and celebration flowerType?: FlowerType.

- [ ] **Step 1: Write failing report transition tests**

~~~ts
it('완료 기준을 넘어 새 씨앗이 된 월말을 단계 하락으로 표시하지 않는다', () => {
  const report = buildStudentMonthlyReport(entriesFrom39To47(), { year: 2026, month: 8 }, 'student-a', { personal: GROWTH_STAGES })
  expect(report.cycleTransition).toEqual({ kind: 'completed', fromCycle: 1, toCycle: 2 })
  expect(report.cycleEnd.currentStage).toBe(0)
})

it('월간 성장값은 사이클 전환과 무관하게 상점-벌점이다', () => {
  expect(buildStudentMonthlyReport(entriesFrom39To47(), ym, 'student-a').totals.netScore).toBe(8)
})
~~~

- [ ] **Step 2: Run and verify failure**

Run: npm test -- monthlyReport

Expected: FAIL because cycle snapshots and cycleTransition are absent.

- [ ] **Step 3: Calculate cycle snapshots**

Derive cycleStart and cycleEnd from the same monthly boundary total scores. Return cycleTransition none when currentCycleNumber matches, completed when it rises, and reverted only when it falls after demerits. Do not change totalsOf, ranking, or award selection.

- [ ] **Step 4: Update report and celebration consumers**

Pass snapshot stage and flower to PlantStep. For completed transition show: 1번째 식물 성장 완료 → 2번째 식물 시작. When the current award winner is before stage 6, get latestCompletedCycleFor and pass its flower_type to celebration; otherwise pass current flower. Keep rank, demerit details, and management controls absent from celebration.

- [ ] **Step 5: Verify and commit**

Run: npm test -- monthlyReport PlantIllustration

~~~bash
git add src/lib/growth-garden/monthlyReport.ts src/lib/growth-garden/monthlyReport.test.ts src/components/growth-garden/report/StudentMonthlyReportView.tsx src/components/growth-garden/awards/MonthlyAwardCelebration.tsx
git commit -m "feat: reflect plant cycles in reports"
~~~

### Task 7: 전체 검증과 배포 전 점검

**Files:**
- Modify only files from Tasks 1~6 if validation finds a defect.
- Review: docs/superpowers/specs/2026-08-31-growth-garden-cycles-design.md

**Interfaces:**
- Consumes: all completed tasks.
- Produces: verified build and concise completion report.

- [ ] **Step 1: Run static and automated validation**

~~~bash
npm test
npm run lint
npm run build
~~~

Expected: all tests pass; lint exits 0; production build completes. Treat the known Vite large-chunk warning as a warning only unless the change creates a build failure.

- [ ] **Step 2: Perform deterministic browser smoke tests**

Confirm 25→45 points exposes flower, visitor, fruit, rich fruit, then a new seed; 92/45 shows two collected flowers and third-cycle 2 points; a demerit lowers only active cycle; refresh preserves current flower and collection; bulk record creates no duplicate collection rows.

- [ ] **Step 3: Verify required surfaces**

Check card, garden, fullscreen, detail, personal monthly report across boundary, legacy 7-value settings fallback, and award celebration with current seed plus latest completed flower. Confirm no flower choice controls or monthly ranking changes appeared.

- [ ] **Step 4: Inspect migration and production scope**

Confirm migration is additive and has RLS plus student ownership checks. No api files change, so the separate Vercel API type-check caveat is not triggered.

- [ ] **Step 5: Commit only validation fixes and report**

~~~bash
git status --short
git add -p
git commit -m "fix: verify plant growth cycles"
~~~

Report only: post-flower stages, completion threshold, cycle calculation, flower reassignment, collection persistence, existing-data compatibility, changed files, migration, TypeScript/lint/build results, and user smoke checks.
