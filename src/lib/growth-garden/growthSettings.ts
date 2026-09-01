/**
 * 성장 기준 설정 — 순수 모듈(React/Supabase 의존 없음).
 *
 * 단계 이름·색·설명은 그대로 두고 **기준 점수만** 교사가 바꿀 수 있다.
 * 기본값은 새로 적지 않고 기존 표(GROWTH_STAGES / GARDEN_ENVIRONMENT_STAGES)에서
 * 뽑아 쓴다 — 두 곳에 같은 숫자를 적어 두면 언젠가 어긋나기 때문.
 */
import {
  GARDEN_ENVIRONMENT_STAGES,
  GROWTH_STAGES,
  type GardenEnvironmentConfig,
  type GrowthStageConfig,
} from './constants'

/** 단계 순서대로의 기준 점수 배열. 0번째(씨앗/씨앗 정원)는 항상 0으로 고정한다. */
export type Thresholds = number[]

export type GrowthSettings = {
  /** 개인 식물 단계 기준 (7개) */
  personal: Thresholds
  /** 학급 정원 단계 기준 — 학생 1인당 평균 점수 (6개) */
  garden: Thresholds
}

export const DEFAULT_PERSONAL_THRESHOLDS: Thresholds = GROWTH_STAGES.map((stage) => stage.minScore)
export const DEFAULT_GARDEN_THRESHOLDS: Thresholds = GARDEN_ENVIRONMENT_STAGES.map((stage) => stage.minAverage)

export const DEFAULT_GROWTH_SETTINGS: GrowthSettings = {
  personal: DEFAULT_PERSONAL_THRESHOLDS,
  garden: DEFAULT_GARDEN_THRESHOLDS,
}

/** 입력 가능한 최대 기준 점수 — 실수로 큰 값을 넣어 단계가 사실상 사라지는 걸 막는다. */
export const MAX_THRESHOLD = 999

/**
 * 저장된 값이 손상됐거나(길이가 다르거나 숫자가 아니거나) 없으면 기본값으로 되돌린다.
 * 화면이 깨진 기준으로 식물을 그리는 것보다 기본값으로 그리는 편이 안전하다.
 */
function safeThresholds(values: unknown, fallback: Thresholds): Thresholds {
  if (!Array.isArray(values)) return fallback
  const numbers = values.map((value) => Number(value))
  if (numbers.some((value) => !Number.isFinite(value))) return fallback
  if (validateThresholds(numbers)) return fallback

  // 기존 사용자는 꽃 피움까지 7개 기준만 저장했다. 앞값은 그대로 보존하고,
  // 마지막 꽃 피움 기준 뒤에 동일한 간격의 후속 단계를 안전하게 덧붙인다.
  if (fallback.length === 11 && numbers.length === 7) {
    const bloomThreshold = numbers[6]
    return [...numbers, bloomThreshold + 5, bloomThreshold + 10, bloomThreshold + 15, bloomThreshold + 20]
  }

  if (numbers.length !== fallback.length) return fallback
  return numbers
}

export function resolveSettings(stored?: Partial<GrowthSettings> | null): GrowthSettings {
  return {
    personal: safeThresholds(stored?.personal, DEFAULT_PERSONAL_THRESHOLDS),
    garden: safeThresholds(stored?.garden, DEFAULT_GARDEN_THRESHOLDS),
  }
}

/**
 * 기준 검증 — 문제가 있으면 사람이 읽을 수 있는 메시지를, 없으면 null을 돌려준다.
 * 규칙: 0단계는 0, 정수, 음수 불가, 상한 이하, 그리고 항상 앞 단계보다 커야 한다.
 */
export function validateThresholds(values: Thresholds): string | null {
  if (values.length === 0) return '기준 값이 비어 있습니다.'
  if (values[0] !== 0) return '첫 단계 기준은 0점이어야 합니다.'

  for (let i = 0; i < values.length; i += 1) {
    const value = values[i]
    if (!Number.isFinite(value)) return '숫자를 입력해 주세요.'
    if (!Number.isInteger(value)) return '기준 점수는 정수여야 합니다.'
    if (value < 0) return '기준 점수는 0점보다 작을 수 없습니다.'
    if (value > MAX_THRESHOLD) return `기준 점수는 ${MAX_THRESHOLD}점까지 입력할 수 있습니다.`
    if (i > 0 && value <= values[i - 1]) return '다음 성장 단계의 점수는 이전 단계보다 커야 합니다.'
  }
  return null
}

/** 기준 점수만 갈아 끼운 단계 표 — 이름·색·설명은 기존 것을 그대로 쓴다. */
export function resolveGrowthStages(personal: Thresholds = DEFAULT_PERSONAL_THRESHOLDS): GrowthStageConfig[] {
  return GROWTH_STAGES.map((stage, index) => ({ ...stage, minScore: personal[index] ?? stage.minScore }))
}

export function resolveEnvironmentStages(
  garden: Thresholds = DEFAULT_GARDEN_THRESHOLDS,
): GardenEnvironmentConfig[] {
  return GARDEN_ENVIRONMENT_STAGES.map((stage, index) => ({
    ...stage,
    minAverage: garden[index] ?? stage.minAverage,
  }))
}

export function isDefaultThresholds(values: Thresholds, defaults: Thresholds): boolean {
  return values.length === defaults.length && values.every((value, index) => value === defaults[index])
}
