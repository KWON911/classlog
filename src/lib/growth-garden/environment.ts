/**
 * 학급 전체 정원 환경 계산 — React/Supabase 의존 없는 순수 모듈.
 *
 * 개별 식물은 `growth.ts`가, 학급 전체 배경은 이 파일이 담당한다.
 * 기준값(단계별 임계 평균, 장식 개수)은 전부 `constants.ts`에 있다.
 */
import {
  GARDEN_ENVIRONMENT_STAGES,
  MAX_ENVIRONMENT_STAGE,
  type GardenEnvironmentConfig,
  type GardenEnvironmentStage,
} from './constants'

/** 정원 단계 표도 설정에서 기준 평균을 바꿀 수 있으므로 인자로 받는다. */
export type EnvironmentTable = GardenEnvironmentConfig[]

export type GardenEnvironment = {
  stage: GardenEnvironmentStage
  current: GardenEnvironmentConfig
  /** 마지막 단계면 null */
  next: GardenEnvironmentConfig | null
  /** 학급 전체 성장 포인트 합계 */
  totalScore: number
  /** 학생 1인당 평균 (학생이 없으면 0) */
  averageScore: number
  /** 다음 단계까지 학급 전체가 더 모아야 하는 포인트. 마지막 단계면 0. */
  remainingPoints: number
  /** 현재 단계 구간의 진행률 0~1. 마지막 단계면 1. */
  ratio: number
}

export function environmentStageForAverage(
  average: number,
  stages: EnvironmentTable = GARDEN_ENVIRONMENT_STAGES,
): GardenEnvironmentStage {
  for (let i = stages.length - 1; i >= 0; i -= 1) {
    if (average >= stages[i].minAverage) return stages[i].stage
  }
  return 0
}

export function environmentConfig(
  stage: GardenEnvironmentStage,
  stages: EnvironmentTable = GARDEN_ENVIRONMENT_STAGES,
): GardenEnvironmentConfig {
  return stages.find((config) => config.stage === stage) ?? stages[0]
}

/**
 * 학생별 성장 포인트 배열로 학급 정원 환경을 계산한다.
 *
 * 평균을 쓰는 이유: 합계 기준이면 인원이 많은 학급이 자동으로 유리해지고,
 * 소규모 학급은 최종 단계에 도달할 수 없다. 반면 교사에게 보여줄 "남은 점수"는
 * 실제로 학급이 더 모아야 할 총점이어야 직관적이므로 평균차 × 인원으로 환산한다.
 */
export function calculateGardenEnvironment(
  scores: number[],
  stages: EnvironmentTable = GARDEN_ENVIRONMENT_STAGES,
): GardenEnvironment {
  const studentCount = scores.length
  const totalScore = scores.reduce((sum, score) => sum + score, 0)
  const averageScore = studentCount > 0 ? totalScore / studentCount : 0

  const stage = environmentStageForAverage(averageScore, stages)
  const current = environmentConfig(stage, stages)
  const next =
    stage === MAX_ENVIRONMENT_STAGE ? null : environmentConfig((stage + 1) as GardenEnvironmentStage, stages)

  if (!next) {
    return { stage, current, next: null, totalScore, averageScore, remainingPoints: 0, ratio: 1 }
  }

  const span = next.minAverage - current.minAverage
  const gained = averageScore - current.minAverage
  // span은 설정상 항상 양수지만, 잘못된 설정으로 0이 되어도 NaN을 UI로 흘리지 않는다.
  const ratio = span > 0 ? Math.min(1, Math.max(0, gained / span)) : 1
  const remainingPoints = Math.max(0, Math.ceil((next.minAverage - averageScore) * studentCount))

  return { stage, current, next, totalScore, averageScore, remainingPoints, ratio }
}
