import { flowerForCycle, type FlowerType } from './flowers'
import { stageForScore, type StageTable } from './growth'
import type { GrowthStage } from './constants'

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
