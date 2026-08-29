import { describe, expect, it } from 'vitest'
import { calculateGardenEnvironment, environmentStageForAverage } from './environment'
import { GARDEN_ENVIRONMENT_STAGES, MAX_ENVIRONMENT_STAGE } from './constants'

describe('environmentStageForAverage', () => {
  it('설정된 모든 단계의 임계 평균에서 그 단계가 된다', () => {
    for (const config of GARDEN_ENVIRONMENT_STAGES) {
      expect(environmentStageForAverage(config.minAverage)).toBe(config.stage)
    }
  })

  it('임계값에 조금 모자라면 이전 단계에 머무른다', () => {
    for (const config of GARDEN_ENVIRONMENT_STAGES.slice(1)) {
      expect(environmentStageForAverage(config.minAverage - 0.1)).toBe(config.stage - 1)
    }
  })

  it('최고 임계값을 크게 넘어도 마지막 단계에서 멈춘다', () => {
    expect(environmentStageForAverage(9999)).toBe(MAX_ENVIRONMENT_STAGE)
  })
})

describe('calculateGardenEnvironment', () => {
  it('학생이 없으면 0단계이고 평균/합계가 0이다 (0으로 나누지 않는다)', () => {
    const env = calculateGardenEnvironment([])
    expect(env.stage).toBe(0)
    expect(env.totalScore).toBe(0)
    expect(env.averageScore).toBe(0)
    expect(Number.isNaN(env.ratio)).toBe(false)
  })

  it('합계가 아니라 1인당 평균으로 단계를 정한다', () => {
    const [, first] = GARDEN_ENVIRONMENT_STAGES
    // 합계는 같지만 인원이 다른 두 학급 — 평균이 낮은 쪽이 더 낮은 단계여야 한다.
    const total = first.minAverage * 4
    const smallClass = calculateGardenEnvironment([total, 0]) // 2명, 평균이 높음
    const bigClass = calculateGardenEnvironment(Array(20).fill(total / 20)) // 20명, 평균이 낮음

    // 부동소수 나눗셈이 섞이므로 합계는 근사 비교 — 요점은 단계 차이다.
    expect(smallClass.totalScore).toBeCloseTo(bigClass.totalScore)
    expect(smallClass.stage).toBeGreaterThan(bigClass.stage)
  })

  it('다음 단계까지 남은 점수를 학급 전체 총점 기준으로 환산한다', () => {
    const [, first] = GARDEN_ENVIRONMENT_STAGES
    const studentCount = 10
    // 전원 0점이면 1단계 평균까지 (임계 평균 × 인원)만큼 더 필요하다.
    const env = calculateGardenEnvironment(Array(studentCount).fill(0))
    expect(env.stage).toBe(0)
    expect(env.next?.stage).toBe(1)
    expect(env.remainingPoints).toBe(first.minAverage * studentCount)
    expect(env.ratio).toBe(0)
  })

  it('마지막 단계에서는 next가 없고 진행률이 100%다', () => {
    const last = GARDEN_ENVIRONMENT_STAGES[GARDEN_ENVIRONMENT_STAGES.length - 1]
    const env = calculateGardenEnvironment([last.minAverage + 10, last.minAverage + 10])
    expect(env.next).toBeNull()
    expect(env.ratio).toBe(1)
    expect(env.remainingPoints).toBe(0)
  })

  it('구간 중간이면 진행률이 0과 1 사이다', () => {
    const [zero, first] = GARDEN_ENVIRONMENT_STAGES
    const midway = (zero.minAverage + first.minAverage) / 2
    const env = calculateGardenEnvironment([midway, midway])
    expect(env.ratio).toBeGreaterThan(0)
    expect(env.ratio).toBeLessThan(1)
  })
})
