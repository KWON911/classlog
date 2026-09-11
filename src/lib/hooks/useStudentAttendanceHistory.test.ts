import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createQueryBuilder } from '../../test/supabaseMock'

const mockFrom = vi.fn()

vi.mock('../supabaseClient', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}))

const { useStudentAttendanceHistory } = await import('./useStudentAttendanceHistory')

describe('useStudentAttendanceHistory', () => {
  beforeEach(() => mockFrom.mockReset())

  it('loads all records for one student and status in newest-first order', async () => {
    const entries = [{ id: 'a1', student_id: 's1', status: '결석', date: '2026-09-01' }]
    const builder = createQueryBuilder({ data: entries, error: null })
    mockFrom.mockReturnValue(builder)

    const { result } = renderHook(() => useStudentAttendanceHistory('s1', '결석'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockFrom).toHaveBeenCalledWith('attendance')
    expect(builder.eq).toHaveBeenCalledWith('student_id', 's1')
    expect(builder.eq).toHaveBeenCalledWith('status', '결석')
    expect(builder.order).toHaveBeenCalledWith('date', { ascending: false })
    expect(result.current.entries).toEqual(entries)
  })

  it('loads every status for the selected student when no status filter is given', async () => {
    const entries = [
      { id: 'a2', student_id: 's1', status: '지각', date: '2026-09-03' },
      { id: 'a1', student_id: 's1', status: '결석', date: '2026-09-01' },
    ]
    const builder = createQueryBuilder({ data: entries, error: null })
    mockFrom.mockReturnValue(builder)

    const { result } = renderHook(() => useStudentAttendanceHistory('s1', undefined))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(builder.eq).toHaveBeenCalledWith('student_id', 's1')
    expect(builder.eq).not.toHaveBeenCalledWith('status', expect.anything())
    expect(builder.order).toHaveBeenCalledWith('date', { ascending: false })
    expect(result.current.entries).toEqual(entries)
  })
})
