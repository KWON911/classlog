import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dispatchClassGardenGoalRefresh, useClassGardenGoal } from './useClassGardenGoal'
import type { ClassGardenUnlock, ClassGoal, GrowthPointEntry } from '../types'
import type { NewClassGardenUnlock } from '../growth-garden/services/types'

const mockStudents = [
  { id: 's1', teacher_id: 't1', number: 1, name: '가람', gender: null, birthdate: null, student_phone: null, address: null, father_name: null, father_phone: null, mother_name: null, mother_phone: null, emergency_contact: null, note: null, created_at: '' },
  { id: 's2', teacher_id: 't1', number: 2, name: '나래', gender: null, birthdate: null, student_phone: null, address: null, father_name: null, father_phone: null, mother_name: null, mother_phone: null, emergency_contact: null, note: null, created_at: '' },
]

const mockGoal: ClassGoal = {
  id: 'goal-1', teacher_id: 't1', year: 2026, month: 9, target_point: 200,
  milestones: [
    { point: 100, decorationType: 'stone_path' },
    { point: 150, decorationType: 'bench' },
    { point: 200, decorationType: 'pond' },
  ],
  created_at: '', updated_at: '',
}

const mockStore: { entries: GrowthPointEntry[]; unlocks: ClassGardenUnlock[]; upsertCalls: NewClassGardenUnlock[][] } = {
  entries: [], unlocks: [], upsertCalls: [],
}

vi.mock('./useStudents', () => ({
  useStudents: () => ({ students: mockStudents, loading: false, error: null }),
}))

vi.mock('../growth-garden/services', () => ({
  growthGardenService: {
    async getClassGoal() { return { data: mockGoal } },
    async listClassGardenUnlocks() { return { data: [...mockStore.unlocks] } },
    async listEntries() { return { data: [...mockStore.entries] } },
    async upsertClassGardenUnlocks(inputs: NewClassGardenUnlock[]) {
      mockStore.upsertCalls.push(inputs)
      const saved = inputs.map((input, index) => ({
        id: `unlock-${mockStore.unlocks.length + index}`,
        teacher_id: 't1',
        ...input,
        unlocked_at: '2026-09-30T09:00:00.000Z',
        created_at: '2026-09-30T09:00:00.000Z',
      }))
      mockStore.unlocks.push(...saved)
      return { data: saved }
    },
    async saveClassGoal() { return { data: mockGoal } },
  },
}))

function merit(id: string, studentId: string, amount: number, source: 'individual' | 'bulk' = 'individual'): GrowthPointEntry {
  return {
    id,
    student_id: studentId,
    teacher_id: 't1',
    type: 'merit',
    amount,
    reason: '협동',
    source,
    batch_id: source === 'bulk' ? 'batch-1' : null,
    created_at: '2026-09-15T09:00:00.000Z',
  }
}

async function setup() {
  const view = renderHook(() => useClassGardenGoal(2026, 9))
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  return view
}

beforeEach(() => {
  mockStore.entries = [merit('before', 's1', 95)]
  mockStore.unlocks = []
  mockStore.upsertCalls = []
})

describe('useClassGardenGoal', () => {
  it('개별 상점 저장 뒤 도달 장식을 한 번 해금한다', async () => {
    const { result } = await setup()
    expect(result.current.progress?.score).toBe(95)

    mockStore.entries.push(merit('individual-merit', 's1', 5))
    await act(async () => { dispatchClassGardenGoalRefresh() })

    await waitFor(() => expect(mockStore.upsertCalls).toEqual([[
      expect.objectContaining({ decoration_type: 'stone_path', year: 2026, month: 9, milestone_point: 100 }),
    ]]))
    expect(result.current.unlocks.map((unlock) => unlock.decoration_type)).toEqual(['stone_path'])
  })

  it('25명 일괄 상점이 같은 milestone에 닿아도 장식을 한 번만 해금한다', async () => {
    mockStore.entries = Array.from({ length: 25 }, (_, index) => merit(`bulk-${index}`, index % 2 === 0 ? 's1' : 's2', 4, 'bulk'))
    const { result } = await setup()

    await waitFor(() => expect(mockStore.upsertCalls).toHaveLength(1))
    expect(mockStore.upsertCalls[0]).toEqual([
      expect.objectContaining({ decoration_type: 'stone_path', milestone_point: 100 }),
    ])
    expect(result.current.unlocks).toHaveLength(1)
  })

  it('일괄 취소로 점수가 내려가도 이미 해금된 장식은 유지하고 다시 저장하지 않는다', async () => {
    mockStore.unlocks = [{
      id: 'existing-unlock', teacher_id: 't1', decoration_type: 'stone_path', year: 2026, month: 9,
      milestone_point: 100, unlocked_at: '2026-09-14T09:00:00.000Z', created_at: '2026-09-14T09:00:00.000Z',
    }]
    mockStore.entries = [merit('individual', 's1', 95), merit('bulk', 's2', 5, 'bulk')]
    const { result } = await setup()

    mockStore.entries = [merit('individual', 's1', 95)]
    await act(async () => { dispatchClassGardenGoalRefresh() })

    await waitFor(() => expect(result.current.progress?.score).toBe(95))
    expect(result.current.progress?.unlockedMilestones.map((milestone) => milestone.decorationType)).toEqual(['stone_path'])
    expect(result.current.unlocks.map((unlock) => unlock.decoration_type)).toEqual(['stone_path'])
    expect(mockStore.upsertCalls).toEqual([])
  })

  it('이전에 영구 해금된 장식은 다음 목표에서 다시 해금하지 않는다', async () => {
    mockStore.unlocks = [{
      id: 'old-unlock', teacher_id: 't1', decoration_type: 'stone_path', year: 2026, month: 8,
      milestone_point: 100, unlocked_at: '2026-08-31T09:00:00.000Z', created_at: '2026-08-31T09:00:00.000Z',
    }]
    mockStore.entries = [merit('enough', 's1', 100)]
    const { result } = await setup()

    expect(result.current.progress?.newlyReachableMilestones).toEqual([])
    expect(mockStore.upsertCalls).toEqual([])
    expect(result.current.unlocks.map((unlock) => unlock.decoration_type)).toEqual(['stone_path'])
  })
})
