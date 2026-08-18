import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
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
})
