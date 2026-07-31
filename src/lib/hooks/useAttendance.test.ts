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

const { useAttendance } = await import('./useAttendance')

const entryA = {
  id: 'a1',
  student_id: 's1',
  teacher_id: 't1',
  date: '2026-08-05',
  status: '결석' as const,
  reason_category: '질병' as const,
  note: null,
  created_at: '2026-08-05',
}

// Same student (s1) as entryA, but a different date — must survive a
// student-only match predicate being (wrongly) sufficient.
const entryBSameStudentDifferentDate = {
  id: 'a2',
  student_id: 's1',
  teacher_id: 't1',
  date: '2026-08-10',
  status: '지각' as const,
  reason_category: '기타' as const,
  note: null,
  created_at: '2026-08-10',
}

// Different student (s2), same date as entryA — must survive a
// date-only match predicate being (wrongly) sufficient.
const entryCDifferentStudentSameDate = {
  id: 'a3',
  student_id: 's2',
  teacher_id: 't1',
  date: '2026-08-05',
  status: '조퇴' as const,
  reason_category: '기타' as const,
  note: null,
  created_at: '2026-08-05',
}

beforeEach(() => {
  mockFrom.mockReset()
  mockGetUser.mockReset()
})

describe('useAttendance', () => {
  it('fetches entries within the given month range', async () => {
    const builder = createQueryBuilder({ data: [entryA], error: null })
    mockFrom.mockReturnValue(builder)

    const { result } = renderHook(() => useAttendance('2026-08'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(builder.gte).toHaveBeenCalledWith('date', '2026-08-01')
    expect(builder.lt).toHaveBeenCalledWith('date', '2026-09-01')
    expect(result.current.entries).toEqual([entryA])
  })

  it('rolls over into next year when the month is December', async () => {
    const builder = createQueryBuilder({ data: [], error: null })
    mockFrom.mockReturnValue(builder)

    const { result } = renderHook(() => useAttendance('2026-12'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(builder.gte).toHaveBeenCalledWith('date', '2026-12-01')
    expect(builder.lt).toHaveBeenCalledWith('date', '2027-01-01')
  })

  it('surfaces the error message when fetch fails', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: { message: '네트워크 오류' } }))

    const { result } = renderHook(() => useAttendance('2026-08'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('네트워크 오류')
  })

  it('upserts an entry with onConflict on student_id,date', async () => {
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        data: [entryA, entryBSameStudentDifferentDate, entryCDifferentStudentSameDate],
        error: null,
      }),
    )
    const { result } = renderHook(() => useAttendance('2026-08'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetUser.mockResolvedValue({ data: { user: { id: 't1' } } })
    const updatedEntryA = { ...entryA, status: '지각' as const, reason_category: '인정' as const }
    const upsertBuilder = createQueryBuilder({ data: updatedEntryA, error: null })
    mockFrom.mockReturnValueOnce(upsertBuilder)

    await act(async () => {
      await result.current.upsertEntry('s1', '2026-08-05', {
        status: '지각',
        reason_category: '인정',
        note: null,
      })
    })

    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      { student_id: 's1', teacher_id: 't1', date: '2026-08-05', status: '지각', reason_category: '인정', note: null },
      { onConflict: 'student_id,date' },
    )
    // The near-miss rows (same student/different date, different student/same date)
    // must survive untouched, and entryA must be replaced (not duplicated).
    expect(result.current.entries).toEqual([
      entryBSameStudentDifferentDate,
      entryCDifferentStudentSameDate,
      updatedEntryA,
    ])
  })

  it('clears an entry by student and date', async () => {
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        data: [entryA, entryBSameStudentDifferentDate, entryCDifferentStudentSameDate],
        error: null,
      }),
    )
    const { result } = renderHook(() => useAttendance('2026-08'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const deleteBuilder = createQueryBuilder({ data: null, error: null })
    mockFrom.mockReturnValueOnce(deleteBuilder)

    await act(async () => {
      await result.current.clearEntry('s1', '2026-08-05')
    })

    expect(deleteBuilder.eq).toHaveBeenCalledWith('student_id', 's1')
    expect(deleteBuilder.eq).toHaveBeenCalledWith('date', '2026-08-05')
    // Only entryA (matching both student_id AND date) should be removed;
    // the near-miss rows must remain.
    expect(result.current.entries).toEqual([entryBSameStudentDifferentDate, entryCDifferentStudentSameDate])
  })
})
