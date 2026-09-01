import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GARDEN_THRESHOLDS,
  DEFAULT_PERSONAL_THRESHOLDS,
  MAX_THRESHOLD,
  isDefaultThresholds,
  resolveEnvironmentStages,
  resolveGrowthStages,
  resolveSettings,
  validateThresholds,
} from './growthSettings'
import { GARDEN_ENVIRONMENT_STAGES, GROWTH_STAGES } from './constants'
import { stageForScore } from './growth'
import { calculateGardenEnvironment } from './environment'

describe('기본값', () => {
  it('기존 단계 표의 기준을 그대로 기본값으로 쓴다', () => {
    expect(DEFAULT_PERSONAL_THRESHOLDS).toEqual(GROWTH_STAGES.map((stage) => stage.minScore))
    expect(DEFAULT_GARDEN_THRESHOLDS).toEqual(GARDEN_ENVIRONMENT_STAGES.map((stage) => stage.minAverage))
  })

  it('설정이 없으면 기본값을 돌려준다', () => {
    expect(resolveSettings(null).personal).toEqual(DEFAULT_PERSONAL_THRESHOLDS)
    expect(resolveSettings(undefined).garden).toEqual(DEFAULT_GARDEN_THRESHOLDS)
  })

  it('기존 7개 개인 기준 뒤에 꽃 피움 기준 기반의 네 단계를 보완한다', () => {
    expect(
      resolveSettings({
        personal: [0, 3, 6, 10, 15, 20, 28],
        garden: DEFAULT_GARDEN_THRESHOLDS,
      }),
    ).toMatchObject({ personal: [0, 3, 6, 10, 15, 20, 28, 33, 38, 43, 48] })
  })

  it('저장된 값이 손상됐으면 기본값으로 되돌린다', () => {
    // 길이가 다르거나, 숫자가 아니거나, 순서가 뒤집힌 값은 신뢰하지 않는다.
    expect(resolveSettings({ personal: [0, 3] }).personal).toEqual(DEFAULT_PERSONAL_THRESHOLDS)
    expect(resolveSettings({ personal: [0, 5, 4, 10, 15, 20, 25] }).personal).toEqual(DEFAULT_PERSONAL_THRESHOLDS)
    expect(resolveSettings({ garden: ['a', 3, 6, 10, 15, 22] as unknown as number[] }).garden).toEqual(
      DEFAULT_GARDEN_THRESHOLDS,
    )
  })

  it('정상 저장값은 그대로 쓴다', () => {
    const custom = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
    expect(resolveSettings({ personal: custom }).personal).toEqual(custom)
  })
})

describe('validateThresholds', () => {
  it('정상 값은 통과한다', () => {
    expect(validateThresholds(DEFAULT_PERSONAL_THRESHOLDS)).toBeNull()
    expect(validateThresholds([0, 1, 2, 3, 4, 5, 6])).toBeNull()
  })

  it('첫 단계는 0이어야 한다', () => {
    expect(validateThresholds([1, 3, 6])).toMatch(/0점/)
  })

  it('앞 단계보다 크지 않으면 막는다', () => {
    expect(validateThresholds([0, 5, 4])).toMatch(/이전 단계보다 커야/)
    expect(validateThresholds([0, 5, 5])).toMatch(/이전 단계보다 커야/)
  })

  it('음수·소수·상한 초과·비숫자를 막는다', () => {
    expect(validateThresholds([0, -1])).not.toBeNull()
    expect(validateThresholds([0, 1.5])).toMatch(/정수/)
    expect(validateThresholds([0, MAX_THRESHOLD + 1])).toMatch(/까지 입력/)
    expect(validateThresholds([0, Number.NaN])).not.toBeNull()
  })
})

describe('resolve*Stages', () => {
  it('기준 점수만 바뀌고 이름·색·설명은 그대로다', () => {
    const custom = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
    const stages = resolveGrowthStages(custom)
    expect(stages.map((stage) => stage.minScore)).toEqual(custom)
    expect(stages.map((stage) => stage.label)).toEqual(GROWTH_STAGES.map((stage) => stage.label))
    expect(stages[6].accent).toBe(GROWTH_STAGES[6].accent)
  })

  it('정원 단계도 이름을 유지한 채 기준 평균만 바뀐다', () => {
    const custom = [0, 2, 4, 6, 8, 10]
    const stages = resolveEnvironmentStages(custom)
    expect(stages.map((stage) => stage.minAverage)).toEqual(custom)
    expect(stages.map((stage) => stage.label)).toEqual(GARDEN_ENVIRONMENT_STAGES.map((stage) => stage.label))
  })
})

describe('설정이 단계 계산에 반영된다', () => {
  it('같은 점수라도 기준에 따라 단계가 달라진다', () => {
    const score = 18
    // 기본 기준(15점 풍성한 잎)에서는 4단계
    expect(stageForScore(score)).toBe(4)
    // 풍성한 잎을 20점으로 올리면 같은 점수가 한 단계 아래로 보인다.
    expect(stageForScore(score, resolveGrowthStages([0, 3, 6, 10, 20, 25, 30]))).toBe(3)
  })

  it('정원 단계도 기준을 따라 달라진다', () => {
    const scores = [12, 12, 12]
    expect(calculateGardenEnvironment(scores).stage).toBe(3)
    expect(calculateGardenEnvironment(scores, resolveEnvironmentStages([0, 2, 4, 6, 8, 10])).stage).toBe(5)
  })
})

describe('isDefaultThresholds', () => {
  it('기본값과 같은지 판별한다', () => {
    expect(isDefaultThresholds(DEFAULT_PERSONAL_THRESHOLDS, DEFAULT_PERSONAL_THRESHOLDS)).toBe(true)
    expect(isDefaultThresholds([0, 1, 2, 3, 4, 5, 6], DEFAULT_PERSONAL_THRESHOLDS)).toBe(false)
  })
})
