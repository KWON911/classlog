import { describe, expect, it } from 'vitest'
import { GROWTH_STAGES } from './constants'
import { flowerForCycle } from './flowers'
import { plantCycleForScore } from './plantCycle'

describe('plantCycleForScore', () => {
  it('완료 기준 점수에서 다음 사이클의 씨앗으로 시작한다', () => {
    expect(plantCycleForScore('student-a', 45, GROWTH_STAGES)).toMatchObject({
      completedCycles: 1,
      currentCycleNumber: 2,
      currentCyclePoint: 0,
      currentStage: 0,
    })
  })

  it('높은 기존 누적 점수도 완료 횟수와 현재 점수로 나눈다', () => {
    expect(plantCycleForScore('student-a', 92, GROWTH_STAGES)).toMatchObject({
      completedCycles: 2,
      currentCycleNumber: 3,
      currentCyclePoint: 2,
    })
  })
})

describe('flowerForCycle', () => {
  it('첫 사이클과 다음 사이클에 같은 꽃을 연속 배정하지 않는다', () => {
    expect(flowerForCycle('student-a', 2)).not.toBe(flowerForCycle('student-a', 1))
  })
})
