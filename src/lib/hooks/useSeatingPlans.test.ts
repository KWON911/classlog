import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createQueryBuilder } from '../../test/supabaseMock'

const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  },
}))

const { useSeatingPlans } = await import('./useSeatingPlans')

const planA = {
  id: 'p1',
  teacher_id: 't1',
  title: '1차 자리표',
  plan_date: '2026-08-05',
  rows: 1,
  columns: 2,
  teacher_direction: 'north' as const,
  seats: [],
  assignments: [],
  separations: [],
  gender_balance: false,
  avoid_past_neighbors: false,
  avoid_previous_seats: false,
  previous_seat_history_scope: 'latest3' as const,
  created_at: '2026-08-05',
}

const planB = { ...planA, id: 'p2', title: '2차 자리표', plan_date: '2026-08-20', created_at: '2026-08-20' }

beforeEach(() => {
  mockFrom.mockReset()
  mockGetUser.mockReset()
})

describe('useSeatingPlans', () => {
  it('fetches plans within the given month range, newest first', async () => {
    const builder = createQueryBuilder({ data: [planB, planA], error: null })
    mockFrom.mockReturnValue(builder)

    const { result } = renderHook(() => useSeatingPlans('2026-08'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(builder.gte).toHaveBeenCalledWith('plan_date', '2026-08-01')
    expect(builder.lt).toHaveBeenCalledWith('plan_date', '2026-09-01')
    expect(result.current.plans).toEqual([planB, planA])
  })

  it('fetches every plan with no date filter when yearMonth is "all"', async () => {
    const builder = createQueryBuilder({ data: [planB, planA], error: null })
    mockFrom.mockReturnValue(builder)

    const { result } = renderHook(() => useSeatingPlans('all'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(builder.gte).not.toHaveBeenCalled()
    expect(builder.lt).not.toHaveBeenCalled()
    expect(result.current.plans).toEqual([planB, planA])
  })

  it('surfaces the error message when fetch fails', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: { message: '네트워크 오류' } }))

    const { result } = renderHook(() => useSeatingPlans('2026-08'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('네트워크 오류')
  })

  it('inserts a new plan when no id is given', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [], error: null }))
    const { result } = renderHook(() => useSeatingPlans('2026-08'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetUser.mockResolvedValue({ data: { user: { id: 't1' } } })
    const insertBuilder = createQueryBuilder({ data: planA, error: null })
    mockFrom.mockReturnValueOnce(insertBuilder)

    const { id, teacher_id, created_at, ...input } = planA
    await act(async () => {
      await result.current.savePlan(null, input)
    })

    expect(insertBuilder.insert).toHaveBeenCalledWith({ ...input, teacher_id: 't1' })
    expect(result.current.plans).toEqual([planA])
  })

  it('updates an existing plan when an id is given', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [planA], error: null }))
    const { result } = renderHook(() => useSeatingPlans('2026-08'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetUser.mockResolvedValue({ data: { user: { id: 't1' } } })
    const updated = { ...planA, title: '수정된 제목' }
    const updateBuilder = createQueryBuilder({ data: updated, error: null })
    mockFrom.mockReturnValueOnce(updateBuilder)

    const { id, teacher_id, created_at, ...input } = updated
    await act(async () => {
      await result.current.savePlan('p1', input)
    })

    expect(updateBuilder.update).toHaveBeenCalledWith(input)
    expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'p1')
    expect(result.current.plans).toEqual([updated])
  })

  it('deletes a plan by id', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [planA], error: null }))
    const { result } = renderHook(() => useSeatingPlans('2026-08'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const deleteBuilder = createQueryBuilder({ data: null, error: null })
    mockFrom.mockReturnValueOnce(deleteBuilder)

    await act(async () => {
      await result.current.deletePlan('p1')
    })

    expect(deleteBuilder.eq).toHaveBeenCalledWith('id', 'p1')
    expect(result.current.plans).toEqual([])
  })
})
