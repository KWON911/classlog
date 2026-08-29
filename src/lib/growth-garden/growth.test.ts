import { describe, expect, it } from 'vitest'
import {
  entriesForStudent,
  scoreFromEntries,
  sortEntriesByNewest,
  stageForScore,
  stageProgress,
  summarizeByStudent,
  summarizeStudent,
} from './growth'
import { GROWTH_STAGES, MAX_STAGE } from './constants'
import type { GrowthPointEntry, GrowthPointType } from '../types'

function entry(
  id: string,
  studentId: string,
  type: GrowthPointType,
  amount: number,
  createdAt: string,
): GrowthPointEntry {
  return {
    id,
    student_id: studentId,
    teacher_id: 'teacher-1',
    type,
    amount,
    reason: type === 'merit' ? '칭찬' : '주의',
    created_at: createdAt,
  }
}

describe('scoreFromEntries', () => {
  it('상점은 더하고 벌점은 뺀다', () => {
    const entries = [
      entry('1', 's1', 'merit', 3, '2026-03-02T01:00:00.000Z'),
      entry('2', 's1', 'merit', 2, '2026-03-02T02:00:00.000Z'),
      entry('3', 's1', 'demerit', 4, '2026-03-02T03:00:00.000Z'),
    ]
    expect(scoreFromEntries(entries)).toBe(1)
  })

  it('벌점이 더 많아도 0 아래로는 내려가지 않는다', () => {
    const entries = [
      entry('1', 's1', 'merit', 1, '2026-03-02T01:00:00.000Z'),
      entry('2', 's1', 'demerit', 5, '2026-03-02T02:00:00.000Z'),
    ]
    expect(scoreFromEntries(entries)).toBe(0)
  })

  it('기록이 없으면 0점', () => {
    expect(scoreFromEntries([])).toBe(0)
  })
})

describe('stageForScore', () => {
  it('설정된 모든 단계의 임계값에서 그 단계가 된다', () => {
    for (const config of GROWTH_STAGES) {
      expect(stageForScore(config.minScore)).toBe(config.stage)
    }
  })

  it('임계값보다 1점 모자라면 이전 단계에 머무른다', () => {
    for (const config of GROWTH_STAGES.slice(1)) {
      expect(stageForScore(config.minScore - 1)).toBe(config.stage - 1)
    }
  })

  it('최고 임계값을 크게 넘어도 마지막 단계에서 멈춘다', () => {
    expect(stageForScore(9999)).toBe(MAX_STAGE)
  })
})

describe('stageProgress', () => {
  it('단계 중간 점수의 진행률을 계산한다', () => {
    // 임계값을 바꿔도 깨지지 않도록 설정에서 직접 구간을 가져온다.
    const [, first, second] = GROWTH_STAGES
    const span = second.minScore - first.minScore
    const score = first.minScore + 1

    const progress = stageProgress(score)
    expect(progress.stage).toBe(first.stage)
    expect(progress.next?.stage).toBe(second.stage)
    expect(progress.ratio).toBeCloseTo(1 / span)
    expect(progress.remaining).toBe(second.minScore - score)
  })

  it('마지막 단계는 next가 없고 진행률이 100%다', () => {
    const progress = stageProgress(GROWTH_STAGES[GROWTH_STAGES.length - 1].minScore + 5)
    expect(progress.next).toBeNull()
    expect(progress.ratio).toBe(1)
    expect(progress.remaining).toBe(0)
  })
})

describe('sortEntriesByNewest', () => {
  it('입력 순서와 무관하게 최신순으로 정렬한다', () => {
    // 일부러 뒤섞인 fixture — 정렬이 빠져 있으면 이 기대값이 깨진다.
    const entries = [
      entry('mid', 's1', 'merit', 1, '2026-03-02T02:00:00.000Z'),
      entry('oldest', 's1', 'merit', 1, '2026-03-01T09:00:00.000Z'),
      entry('newest', 's1', 'demerit', 1, '2026-03-03T08:00:00.000Z'),
    ]
    expect(sortEntriesByNewest(entries).map((item) => item.id)).toEqual(['newest', 'mid', 'oldest'])
  })

  it('원본 배열을 변경하지 않는다', () => {
    const entries = [
      entry('a', 's1', 'merit', 1, '2026-03-01T01:00:00.000Z'),
      entry('b', 's1', 'merit', 1, '2026-03-02T01:00:00.000Z'),
    ]
    sortEntriesByNewest(entries)
    expect(entries.map((item) => item.id)).toEqual(['a', 'b'])
  })
})

describe('entriesForStudent', () => {
  it('해당 학생 기록만 최신순으로 돌려준다', () => {
    const entries = [
      entry('other', 's2', 'merit', 5, '2026-03-05T01:00:00.000Z'),
      entry('mine-old', 's1', 'merit', 1, '2026-03-01T01:00:00.000Z'),
      entry('mine-new', 's1', 'demerit', 2, '2026-03-04T01:00:00.000Z'),
    ]
    expect(entriesForStudent(entries, 's1').map((item) => item.id)).toEqual(['mine-new', 'mine-old'])
  })
})

describe('summarizeStudent / summarizeByStudent', () => {
  const entries = [
    entry('b', 's1', 'demerit', 2, '2026-03-04T01:00:00.000Z'),
    entry('a', 's1', 'merit', 10, '2026-03-01T01:00:00.000Z'),
    entry('c', 's2', 'merit', 3, '2026-03-02T01:00:00.000Z'),
  ]

  it('학생별 상·벌점 합계와 단계를 계산한다', () => {
    const summary = summarizeStudent(entries, 's1')
    expect(summary.meritTotal).toBe(10)
    expect(summary.demeritTotal).toBe(2)
    expect(summary.score).toBe(8)
    expect(summary.stage).toBe(stageForScore(8))
    expect(summary.entryCount).toBe(2)
    // 입력 순서가 뒤섞여 있어도 가장 늦은 시각을 고른다.
    expect(summary.lastEntryAt).toBe('2026-03-04T01:00:00.000Z')
  })

  it('기록이 없는 학생은 빈 요약을 돌려준다', () => {
    const summary = summarizeStudent(entries, 's-none')
    expect(summary.score).toBe(0)
    expect(summary.stage).toBe(0)
    expect(summary.entryCount).toBe(0)
    expect(summary.lastEntryAt).toBeNull()
  })

  it('한 번의 순회로 학생별 요약 맵을 만든다', () => {
    const map = summarizeByStudent(entries)
    expect(map.get('s1')?.score).toBe(8)
    expect(map.get('s2')?.score).toBe(3)
    expect(map.has('s-none')).toBe(false)
  })
})
