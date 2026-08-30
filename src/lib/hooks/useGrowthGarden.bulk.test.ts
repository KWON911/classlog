import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGrowthGarden } from './useGrowthGarden'
import type { GrowthPointEntry } from '../types'
import type { NewGrowthPointEntry } from '../growth-garden/services/types'

/**
 * 일괄 상벌점의 저장 규칙 검증.
 *
 * 서비스만 갈아끼우고 훅·집계 로직은 실제 코드를 그대로 쓴다 — "일괄로 저장해도
 * 개별 기록과 똑같이 계산되는가"가 이 테스트의 요점이기 때문이다.
 * (vi.mock 팩토리에서 참조하는 변수는 mock 접두사가 필요하다 — 호이스팅 규칙)
 */
const mockStore: { entries: GrowthPointEntry[]; addEntriesCalls: number } = { entries: [], addEntriesCalls: 0 }

vi.mock('../growth-garden/services', () => ({
  growthGardenService: {
    async listEntries() {
      return { data: [...mockStore.entries] }
    },
    async addEntry(input: NewGrowthPointEntry) {
      const entry = mockEntry(input, mockStore.entries.length)
      mockStore.entries.push(entry)
      return { data: entry }
    },
    async addEntries(inputs: NewGrowthPointEntry[]) {
      // 요청 횟수를 세어 "학생 수만큼 호출"이 아닌지 확인한다.
      mockStore.addEntriesCalls += 1
      const created = inputs.map((input, index) => mockEntry(input, mockStore.entries.length + index))
      mockStore.entries.push(...created)
      return { data: created }
    },
    async deleteBatch(batchId: string) {
      mockStore.entries = mockStore.entries.filter((entry) => entry.batch_id !== batchId)
      return {}
    },
    async deleteEntry() {
      return {}
    },
    async clearStudent() {
      return {}
    },
    async clearClass() {
      return {}
    },
  },
}))

function mockEntry(input: NewGrowthPointEntry, index: number): GrowthPointEntry {
  return {
    id: `e${index}`,
    student_id: input.student_id,
    teacher_id: 't1',
    type: input.type,
    amount: Math.abs(input.amount),
    reason: input.reason,
    source: input.source ?? 'individual',
    batch_id: input.batch_id ?? null,
    created_at: new Date(2026, 7, 30, 9, index).toISOString(),
  }
}

async function setup() {
  const view = renderHook(() => useGrowthGarden())
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  return view
}

beforeEach(() => {
  mockStore.entries = []
  mockStore.addEntriesCalls = 0
})

describe('선택 학생 일괄 상벌점', () => {
  it('학생 3명 +1 — 기록 3개, 같은 batchId, source bulk, 각자 +1점', async () => {
    const { result } = await setup()

    await act(async () => {
      await result.current.addBulkPoints({
        studentIds: ['a', 'b', 'c'],
        type: 'merit',
        amount: 1,
        reason: '모둠 활동에 적극적으로 참여했어요',
      })
    })

    expect(result.current.entries).toHaveLength(3)
    expect(new Set(result.current.entries.map((entry) => entry.batch_id)).size).toBe(1)
    expect(result.current.entries.every((entry) => entry.source === 'bulk')).toBe(true)
    for (const id of ['a', 'b', 'c']) {
      expect(result.current.summaryFor(id).score).toBe(1)
      expect(result.current.summaryFor(id).entryCount).toBe(1)
    }
    // 학생 수만큼 요청을 보내지 않는다.
    expect(mockStore.addEntriesCalls).toBe(1)
  })

  it('벌점 -2 — 점수는 0 아래로 내려가지 않는다', async () => {
    const { result } = await setup()

    await act(async () => {
      await result.current.addPoint('a', 'merit', 3, '발표를 잘했어요')
    })
    await act(async () => {
      await result.current.addBulkPoints({ studentIds: ['a', 'b'], type: 'demerit', amount: 2, reason: '정리 미흡' })
    })

    expect(result.current.summaryFor('a').score).toBe(1)
    // b는 상점이 없으므로 -2가 아니라 0에서 멈춘다.
    expect(result.current.summaryFor('b').score).toBe(0)
  })

  it('개별 기록과 일괄 기록이 한 학생 안에서 합산된다', async () => {
    const { result } = await setup()

    await act(async () => {
      await result.current.addPoint('a', 'merit', 3, '발표를 잘했어요')
    })
    await act(async () => {
      await result.current.addBulkPoints({ studentIds: ['a'], type: 'merit', amount: 2, reason: '모둠 활동' })
    })

    expect(result.current.summaryFor('a').score).toBe(5)
  })

  it('선택이 비어 있으면 요청 자체를 보내지 않는다', async () => {
    const { result } = await setup()

    let outcome: { error?: string } = {}
    await act(async () => {
      outcome = await result.current.addBulkPoints({ studentIds: [], type: 'merit', amount: 1, reason: '사유' })
    })

    expect(outcome.error).toBeTruthy()
    expect(mockStore.addEntriesCalls).toBe(0)
  })

  it('일괄 취소는 그 묶음만 지우고 나머지 점수는 남은 기록으로 다시 계산된다', async () => {
    const { result } = await setup()

    await act(async () => {
      await result.current.addPoint('a', 'merit', 3, '발표를 잘했어요')
    })
    let batchId = ''
    await act(async () => {
      const outcome = await result.current.addBulkPoints({
        studentIds: ['a', 'b'],
        type: 'merit',
        amount: 2,
        reason: '모둠 활동',
      })
      batchId = outcome.batchId ?? ''
    })
    // 취소 대상이 아닌 두 번째 일괄 작업도 함께 둔다 — 무관한 기록까지 지우면 실패한다.
    await act(async () => {
      await result.current.addBulkPoints({ studentIds: ['b'], type: 'merit', amount: 1, reason: '준비를 잘했어요' })
    })

    expect(result.current.summaryFor('a').score).toBe(5)
    expect(result.current.summaryFor('b').score).toBe(3)

    await act(async () => {
      await result.current.deleteBatch(batchId)
    })

    expect(result.current.summaryFor('a').score).toBe(3)
    expect(result.current.summaryFor('b').score).toBe(1)
    expect(result.current.entries.some((entry) => entry.batch_id === batchId)).toBe(false)
    expect(result.current.entries).toHaveLength(2)
  })
})
