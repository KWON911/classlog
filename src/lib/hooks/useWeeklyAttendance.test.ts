import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createQueryBuilder } from '../../test/supabaseMock'

const mockFrom = vi.fn()

vi.mock('../supabaseClient', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}))

const { useWeeklyAttendance } = await import('./useWeeklyAttendance')

beforeEach(() => {
  mockFrom.mockReset()
})

describe('useWeeklyAttendance', () => {
  it('queries attendance joined with students, filtered to the given date range', async () => {
    const builder = createQueryBuilder({ data: [], error: null })
    mockFrom.mockReturnValue(builder)

    const weekStart = new Date(2026, 7, 3) // Monday 2026-08-03
    const weekEnd = new Date(2026, 7, 7) // Friday 2026-08-07
    const { result } = renderHook(() => useWeeklyAttendance(weekStart, weekEnd, 0))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockFrom).toHaveBeenCalledWith('attendance')
    expect(builder.select).toHaveBeenCalledWith('*, students(number, name)')
    expect(builder.gte).toHaveBeenCalledWith('date', '2026-08-03')
    expect(builder.lte).toHaveBeenCalledWith('date', '2026-08-07')
  })

  it('returns the joined rows on success', async () => {
    const row = {
      id: 'a1',
      student_id: 's1',
      teacher_id: 't1',
      date: '2026-08-05',
      status: '결석' as const,
      reason_category: '질병' as const,
      note: null,
      created_at: '2026-08-05',
      students: { number: 3, name: '김민준' },
    }
    mockFrom.mockReturnValue(createQueryBuilder({ data: [row], error: null }))

    const { result } = renderHook(() => useWeeklyAttendance(new Date(2026, 7, 3), new Date(2026, 7, 7), 0))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toEqual([row])
    expect(result.current.error).toBeNull()
  })

  it('surfaces the error message when the query fails', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: { message: '네트워크 오류' } }))

    const { result } = renderHook(() => useWeeklyAttendance(new Date(2026, 7, 3), new Date(2026, 7, 7), 0))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('네트워크 오류')
    expect(result.current.data).toEqual([])
  })

  it('refetches when refreshToken changes', async () => {
    const builder = createQueryBuilder({ data: [], error: null })
    mockFrom.mockReturnValue(builder)

    const weekStart = new Date(2026, 7, 3)
    const weekEnd = new Date(2026, 7, 7)
    const { rerender } = renderHook(({ token }) => useWeeklyAttendance(weekStart, weekEnd, token), {
      initialProps: { token: 0 },
    })

    await waitFor(() => expect(mockFrom).toHaveBeenCalledTimes(1))

    rerender({ token: 1 })

    await waitFor(() => expect(mockFrom).toHaveBeenCalledTimes(2))
  })

  it('discards a stale response that resolves after a newer request has already resolved', async () => {
    type Row = { id: string; student_id: string; teacher_id: string; date: string; status: '결석'; reason_category: '질병'; note: null; created_at: string; students: { number: number; name: string } }
    const staleRow: Row = {
      id: 'stale',
      student_id: 's1',
      teacher_id: 't1',
      date: '2026-08-05',
      status: '결석',
      reason_category: '질병',
      note: null,
      created_at: '2026-08-05',
      students: { number: 3, name: '김민준' },
    }
    const freshRow: Row = { ...staleRow, id: 'fresh', date: '2026-08-12' }

    let resolveStale!: (v: { data: Row[]; error: null }) => void
    let resolveFresh!: (v: { data: Row[]; error: null }) => void
    const stalePromise = new Promise<{ data: Row[]; error: null }>((resolve) => {
      resolveStale = resolve
    })
    const freshPromise = new Promise<{ data: Row[]; error: null }>((resolve) => {
      resolveFresh = resolve
    })

    function builderForPromise(promise: Promise<{ data: Row[]; error: null }>) {
      const builder: Record<string, unknown> = {}
      for (const method of ['select', 'order', 'eq', 'gte', 'lt', 'lte', 'insert', 'update', 'upsert', 'delete']) {
        builder[method] = vi.fn(() => builder)
      }
      builder.then = (
        onFulfilled: (value: { data: Row[]; error: null }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => promise.then(onFulfilled, onRejected)
      return builder
    }

    mockFrom.mockImplementationOnce(() => builderForPromise(stalePromise))
    mockFrom.mockImplementationOnce(() => builderForPromise(freshPromise))

    const { result, rerender } = renderHook(
      ({ start, end }) => useWeeklyAttendance(start, end, 0),
      { initialProps: { start: new Date(2026, 7, 3), end: new Date(2026, 7, 7) } },
    )

    // Dispatch the second (newer) request before the first resolves, simulating
    // the user clicking "다음 주" twice in quick succession.
    rerender({ start: new Date(2026, 7, 10), end: new Date(2026, 7, 14) })

    await waitFor(() => expect(mockFrom).toHaveBeenCalledTimes(2))

    // Resolve out of order: the newer (second-dispatched) request resolves first,
    // then the older (first-dispatched, now-stale) request resolves last.
    resolveFresh({ data: [freshRow], error: null })
    await waitFor(() => expect(result.current.data).toEqual([freshRow]))

    await act(async () => {
      resolveStale({ data: [staleRow], error: null })
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    // The stale response must not have overwritten the newer data.
    expect(result.current.data).toEqual([freshRow])
  })
})
