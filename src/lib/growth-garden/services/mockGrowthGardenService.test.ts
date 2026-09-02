import { beforeEach, describe, expect, it } from 'vitest'
import { mockGrowthGardenService } from './mockGrowthGardenService'
import type { NewClassGardenUnlock, NewClassGoal } from './types'

const septemberGoal: NewClassGoal = {
  year: 2026,
  month: 9,
  target_point: 300,
  milestones: [
    { point: 100, decorationType: 'stone_path' },
    { point: 200, decorationType: 'pond' },
    { point: 300, decorationType: 'big_tree' },
  ],
}

const octoberGoal: NewClassGoal = {
  ...septemberGoal,
  month: 10,
  target_point: 450,
}

const pondUnlock: NewClassGardenUnlock = {
  decoration_type: 'pond',
  year: 2026,
  month: 9,
  milestone_point: 200,
}

describe('mockGrowthGardenService class goals', () => {
  beforeEach(() => window.localStorage.clear())

  it('다른 달 목표를 덮어쓰지 않고 같은 장식의 해금을 한 행으로 유지한다', async () => {
    await mockGrowthGardenService.saveClassGoal(septemberGoal)
    await mockGrowthGardenService.saveClassGoal(octoberGoal)
    await mockGrowthGardenService.upsertClassGardenUnlocks([pondUnlock, pondUnlock])

    expect((await mockGrowthGardenService.getClassGoal(2026, 9)).data?.target_point).toBe(300)
    expect((await mockGrowthGardenService.getClassGoal(2026, 10)).data?.target_point).toBe(450)
    expect((await mockGrowthGardenService.listClassGardenUnlocks()).data).toHaveLength(1)
  })

  it('기존 장식과 같은 요청 내 중복 장식을 모두 한 해금으로 합친다', async () => {
    await mockGrowthGardenService.upsertClassGardenUnlocks([pondUnlock, pondUnlock])
    const result = await mockGrowthGardenService.upsertClassGardenUnlocks([pondUnlock, pondUnlock])

    expect(result.data).toEqual([])
    expect((await mockGrowthGardenService.listClassGardenUnlocks()).data).toMatchObject([
      { decoration_type: 'pond', year: 2026, month: 9, milestone_point: 200 },
    ])
  })

  it('목표를 읽은 뒤 해금이 생겨도 저장 경계에서 해금 단계를 다시 검증한다', async () => {
    await mockGrowthGardenService.saveClassGoal(septemberGoal)
    await mockGrowthGardenService.upsertClassGardenUnlocks([pondUnlock])

    const result = await mockGrowthGardenService.saveClassGoal({
      ...septemberGoal,
      milestones: [
        { point: 100, decorationType: 'stone_path' },
        { point: 200, decorationType: 'bench' },
        { point: 300, decorationType: 'big_tree' },
      ],
    })

    expect(result).toEqual({ error: expect.stringContaining('해금') })
    expect((await mockGrowthGardenService.getClassGoal(2026, 9)).data?.milestones[1]).toEqual({
      point: 200,
      decorationType: 'pond',
    })
  })

  it('손상된 목표·해금 저장값은 안전한 빈 결과를 반환한다', async () => {
    window.localStorage.setItem('classlog:growth-garden:class-goals', '{not json')
    window.localStorage.setItem('classlog:growth-garden:class-garden-unlocks', JSON.stringify({ invalid: true }))

    expect(await mockGrowthGardenService.getClassGoal(2026, 9)).toEqual({ data: null })
    expect(await mockGrowthGardenService.listClassGardenUnlocks()).toEqual({ data: [] })
  })

  it('도메인 규칙을 깨는 저장된 목표 행은 반환하지 않는다', async () => {
    window.localStorage.setItem('classlog:growth-garden:class-goals', JSON.stringify([{
      id: 'broken-goal',
      teacher_id: 'mock-teacher',
      year: 2026,
      month: 9,
      target_point: 300,
      milestones: [],
      created_at: '2026-09-01T00:00:00.000Z',
      updated_at: '2026-09-01T00:00:00.000Z',
    }]))

    expect(await mockGrowthGardenService.getClassGoal(2026, 9)).toEqual({ data: null })
  })
})
