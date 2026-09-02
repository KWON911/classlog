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

const mockStore: {
  entries: GrowthPointEntry[]
  unlocks: ClassGardenUnlock[]
  upsertCalls: NewClassGardenUnlock[][]
  saveCalls: unknown[]
  unlockError: string | null
  ignoreUnlockInsert: boolean
  listUnlockCalls: number
  goalError: string | null
  pendingGoal: Promise<{ data: ClassGoal | null }> | null
} = {
  entries: [], unlocks: [], upsertCalls: [], saveCalls: [], unlockError: null, ignoreUnlockInsert: false, listUnlockCalls: 0, goalError: null, pendingGoal: null,
}

vi.mock('./useStudents', () => ({
  useStudents: () => ({ students: mockStudents, loading: false, error: null }),
}))

vi.mock('../growth-garden/services', () => ({
  growthGardenService: {
    async getClassGoal() {
      if (mockStore.pendingGoal) return mockStore.pendingGoal
      if (mockStore.goalError) return { data: null, error: mockStore.goalError }
      return { data: mockGoal }
    },
    async listClassGardenUnlocks() {
      mockStore.listUnlockCalls += 1
      return { data: [...mockStore.unlocks] }
    },
    async listEntries() { return { data: [...mockStore.entries] } },
    async upsertClassGardenUnlocks(inputs: NewClassGardenUnlock[]) {
      mockStore.upsertCalls.push(inputs)
      if (mockStore.unlockError) return { error: mockStore.unlockError }
      const saved = inputs.map((input, index) => ({
        id: `unlock-${mockStore.unlocks.length + index}`,
        teacher_id: 't1',
        ...input,
        unlocked_at: '2026-09-30T09:00:00.000Z',
        created_at: '2026-09-30T09:00:00.000Z',
      }))
      mockStore.unlocks.push(...saved)
      if (mockStore.ignoreUnlockInsert) return { data: [] }
      return { data: saved }
    },
    async saveClassGoal(input: unknown) {
      mockStore.saveCalls.push(input)
      return { data: mockGoal }
    },
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
  mockStore.saveCalls = []
  mockStore.unlockError = null
  mockStore.ignoreUnlockInsert = false
  mockStore.listUnlockCalls = 0
  mockStore.goalError = null
  mockStore.pendingGoal = null
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

  it('해금 저장 실패를 노출하고 실제 저장 전에는 새 해금 애니메이션을 요청하지 않으며 재시도한다', async () => {
    mockStore.entries = [merit('enough', 's1', 100)]
    mockStore.unlockError = '해금 저장 실패'
    const { result } = await setup()

    expect(result.current.error).toBe('해금 저장 실패')
    expect(result.current.newlyUnlockedTypes).toEqual(new Set())
    expect(mockStore.upsertCalls).toHaveLength(1)

    mockStore.unlockError = null
    await act(async () => { await result.current.refresh() })

    expect(mockStore.upsertCalls).toHaveLength(2)
    expect(result.current.error).toBeNull()
    expect(result.current.newlyUnlockedTypes).toEqual(new Set(['stone_path']))
  })

  it('동시 저장으로 upsert가 빈 결과를 반환하면 애니메이션 없이 최신 해금 목록을 다시 읽는다', async () => {
    mockStore.entries = [merit('enough', 's1', 100)]
    mockStore.ignoreUnlockInsert = true
    const { result } = await setup()

    expect(mockStore.listUnlockCalls).toBe(2)
    expect(result.current.unlocks.map((unlock) => unlock.decoration_type)).toEqual(['stone_path'])
    expect(result.current.newlyUnlockedTypes).toEqual(new Set())
  })

  it('월 전환 조회 중과 조회 오류 뒤에 이전 달 목표를 남기지 않는다', async () => {
    const view = renderHook(
      ({ year, month }) => useClassGardenGoal(year, month),
      { initialProps: { year: 2026, month: 9 } },
    )
    await waitFor(() => expect(view.result.current.loading).toBe(false))
    expect(view.result.current.goal?.month).toBe(9)

    let resolveGoal!: (value: { data: ClassGoal | null }) => void
    mockStore.pendingGoal = new Promise((resolve) => { resolveGoal = resolve })
    view.rerender({ year: 2026, month: 10 })

    await waitFor(() => expect(view.result.current.loading).toBe(true))
    expect(view.result.current.goal).toBeNull()
    expect(view.result.current.progress).toBeNull()

    resolveGoal({ data: { ...mockGoal, month: 10 } })
    mockStore.pendingGoal = null
    await waitFor(() => expect(view.result.current.loading).toBe(false))

    mockStore.goalError = '목표 조회 실패'
    await act(async () => { await view.result.current.refresh() })
    expect(view.result.current.goal).toBeNull()
    expect(view.result.current.progress).toBeNull()
    expect(view.result.current.error).toBe('목표 조회 실패')
  })

  it('목표 또는 해금 목록 조회가 실패한 스냅샷에서는 목표 저장을 차단한다', async () => {
    mockStore.goalError = '목표 조회 실패'
    const { result } = await setup()

    const saved = await act(async () => result.current.saveGoal({
      year: 2026,
      month: 9,
      target_point: 300,
      milestones: [
        { point: 100, decorationType: 'stone_path' },
        { point: 200, decorationType: 'bench' },
        { point: 300, decorationType: 'pond' },
      ],
    }))

    expect(result.current.dataReady).toBe(false)
    expect(saved).toEqual({ error: expect.stringContaining('다시 불러온 뒤') })
    expect(mockStore.saveCalls).toEqual([])
  })

  it('이미 해금된 단계의 점수나 장식을 바꾼 목표는 저장하지 않는다', async () => {
    mockStore.unlocks = [{
      id: 'existing-unlock', teacher_id: 't1', decoration_type: 'stone_path', year: 2026, month: 9,
      milestone_point: 100, unlocked_at: '2026-09-14T09:00:00.000Z', created_at: '2026-09-14T09:00:00.000Z',
    }]
    const { result } = await setup()

    const saved = await act(async () => result.current.saveGoal({
      year: 2026,
      month: 9,
      target_point: 300,
      milestones: [
        { point: 120, decorationType: 'stone_path' },
        { point: 200, decorationType: 'bench' },
        { point: 300, decorationType: 'pond' },
      ],
    }))

    expect(saved).toEqual({ error: expect.stringContaining('해금') })
    expect(mockStore.saveCalls).toEqual([])
  })

  it('사용하지 않은 장식이 3개 미만이면 새 월 목표를 저장하지 않는다', async () => {
    mockStore.unlocks = ['stone_path', 'bench', 'pond', 'birdhouse', 'big_tree', 'bridge'].map((decorationType, index) => ({
      id: `unlock-${index}`, teacher_id: 't1', decoration_type: decorationType as ClassGardenUnlock['decoration_type'], year: 2026, month: 8,
      milestone_point: (index + 1) * 10, unlocked_at: '2026-08-14T09:00:00.000Z', created_at: '2026-08-14T09:00:00.000Z',
    }))
    const { result } = await setup()

    const saved = await act(async () => result.current.saveGoal({
      year: 2026,
      month: 10,
      target_point: 300,
      milestones: [
        { point: 100, decorationType: 'fence' },
        { point: 200, decorationType: 'garden_lamp' },
        { point: 300, decorationType: 'stone_path' },
      ],
    }))

    expect(saved).toEqual({ error: expect.stringContaining('3개') })
    expect(mockStore.saveCalls).toEqual([])
  })
})
