import { flowerForCycle, type FlowerType } from './flowers'
import { signedValue, stageForScore, type StageTable } from './growth'
import type { GrowthStage } from './constants'
import type { GrowthPointEntry, PlantCycle } from '../types'
import type { NewPlantCycle } from './services/types'

/** 누적 성장점수에서 현재 식물의 성장 사이클을 안전하게 파생한 값. */
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
  const completionThreshold = stages[stages.length - 1]?.minScore ?? 1
  const totalGrowthPoint = Math.max(0, score)
  const completedCycles = Math.floor(totalGrowthPoint / completionThreshold)
  const currentCycleNumber = completedCycles + 1
  const currentCyclePoint = totalGrowthPoint % completionThreshold

  return {
    totalGrowthPoint,
    completionThreshold,
    completedCycles,
    currentCycleNumber,
    currentCyclePoint,
    currentStage: stageForScore(currentCyclePoint, stages),
    currentFlowerType: flowerForCycle(studentId, currentCycleNumber),
  }
}

/** 이미 저장되지 않은 완료 사이클만, 실제 점수가 기준을 처음 넘긴 기록 시각으로 보정한다. */
export function backfillPlantCycles(
  studentId: string,
  entries: GrowthPointEntry[],
  existing: PlantCycle[],
  stages: StageTable,
): NewPlantCycle[] {
  const threshold = stages[stages.length - 1]?.minScore ?? 1
  const mine = entries.filter((entry) => entry.student_id === studentId).sort((a, b) => a.created_at.localeCompare(b.created_at))
  const total = Math.max(0, mine.reduce((sum, entry) => sum + signedValue(entry), 0))
  const completed = Math.floor(total / threshold)
  const known = new Set(existing.filter((cycle) => cycle.student_id === studentId).map((cycle) => cycle.cycle_number))
  const crossedAt = new Map<number, string>()
  let score = 0
  for (const entry of mine) {
    score = Math.max(0, score + signedValue(entry))
    for (let cycle = 1; cycle <= completed; cycle += 1) {
      if (!crossedAt.has(cycle) && score >= cycle * threshold) crossedAt.set(cycle, entry.created_at)
    }
  }
  return Array.from({ length: completed }, (_, index) => index + 1)
    .filter((cycleNumber) => !known.has(cycleNumber))
    .map((cycleNumber) => ({ student_id: studentId, cycle_number: cycleNumber, flower_type: flowerForCycle(studentId, cycleNumber), completed_at: crossedAt.get(cycleNumber) ?? mine.at(-1)?.created_at ?? new Date(0).toISOString(), completion_threshold: threshold }))
}
