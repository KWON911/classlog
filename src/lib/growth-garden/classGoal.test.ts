import { describe, expect, it } from 'vitest'
import type { GrowthPointEntry } from '../types'
import {
  buildClassGoalProgress,
  classGoalScore,
  validateClassGoalMilestones,
} from './classGoal'

function entry(id: string, student_id: string, type: GrowthPointEntry['type'], amount: number, date: string, source?: GrowthPointEntry['source']): GrowthPointEntry {
  return { id, student_id, teacher_id: 'teacher-1', type, amount, reason: '테스트', source, created_at: date }
}

const goal = {
  id: 'goal-1', teacher_id: 'teacher-1', year: 2026, month: 9, target_point: 300,
  milestones: [
    { point: 100, decorationType: 'stone_path' as const },
    { point: 200, decorationType: 'bench' as const },
    { point: 300, decorationType: 'pond' as const },
  ],
  created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-01T00:00:00.000Z',
}

describe('classGoalScore', () => {
  it('현재 학생의 개인·일괄 merit만 합산하고 demerit과 이전 학생은 제외한다', () => {
    const entries = [
      entry('a', 's1', 'merit', 5, '2026-09-05T01:00:00.000Z'),
      entry('b', 's2', 'merit', 8, '2026-09-06T01:00:00.000Z', 'bulk'),
      entry('c', 's1', 'demerit', 99, '2026-09-07T01:00:00.000Z'),
      entry('d', 'former', 'merit', 100, '2026-09-08T01:00:00.000Z'),
    ]
    expect(classGoalScore(entries, new Set(['s1', 's2']), { year: 2026, month: 9 })).toBe(13)
  })

  it('로컬 월의 시작은 포함하고 이전 달 말과 다음 달 시작은 제외한다', () => {
    const entries = [
      entry('prev', 's1', 'merit', 10, new Date(2026, 8, 0, 23, 59, 59).toISOString()),
      entry('first', 's1', 'merit', 2, new Date(2026, 8, 1, 0, 0, 0).toISOString()),
      entry('next', 's1', 'merit', 20, new Date(2026, 9, 1, 0, 0, 0).toISOString()),
    ]
    expect(classGoalScore(entries, new Set(['s1']), { year: 2026, month: 9 })).toBe(2)
  })
})

describe('validateClassGoalMilestones', () => {
  const valid = goal.milestones
  it('유효한 3~5개 milestone은 통과한다', () => expect(validateClassGoalMilestones(valid, 300)).toBeNull())
  it.each([
    ['개수가 2개면 거부한다', valid.slice(0, 2), 300, /3~5개/],
    ['점수가 양의 정수가 아니면 거부한다', [{ point: 0, decorationType: 'stone_path' as const }, ...valid.slice(1)], 300, /양의 정수/],
    ['점수가 엄격히 오름차순이 아니면 거부한다', [{ point: 100, decorationType: 'stone_path' as const }, { point: 100, decorationType: 'bench' as const }, valid[2]], 300, /오름차순/],
    ['장식이 중복되면 거부한다', [valid[0], { point: 200, decorationType: 'stone_path' as const }, valid[2]], 300, /중복/],
    ['마지막 점수가 목표보다 크면 거부한다', valid, 299, /목표/],
  ])('%s', (_, milestones, target, message) => expect(validateClassGoalMilestones(milestones, target)).toMatch(message))
})

describe('buildClassGoalProgress', () => {
  it('점수가 내려가도 기존 해금은 reached로 남고 새 해금으로 반복되지 않는다', () => {
    const existing = [{ id: 'unlock-1', teacher_id: 'teacher-1', decoration_type: 'stone_path' as const, year: 2026, month: 9, milestone_point: 100, unlocked_at: '', created_at: '' }]
    const progress = buildClassGoalProgress(goal, 80, existing)
    expect(progress.unlockedMilestones).toHaveLength(1)
    expect(progress.unlockedMilestones[0].decorationType).toBe('stone_path')
    expect(progress.newlyReachableMilestones).toEqual([])
    expect(progress.milestones[0].reached).toBe(true)
  })

  it('목표 점수에 도달하면 완료이며 다음 milestone은 없다', () => {
    const progress = buildClassGoalProgress(goal, 300, [])
    expect(progress.score).toBe(300)
    expect(progress.target).toBe(300)
    expect(progress.completed).toBe(true)
    expect(progress.nextMilestone).toBeNull()
    expect(progress.newlyReachableMilestones).toEqual(goal.milestones)
  })
})
