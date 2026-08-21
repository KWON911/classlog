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
  neis_entered: false,
  document_received: false,
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
  neis_entered: false,
  document_received: false,
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
  neis_entered: false,
  document_received: false,
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

  it('deletes exactly one record by id, leaving same-student/same-date near-misses alone', async () => {
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        data: [entryA, entryBSameStudentDifferentDate, entryCDifferentStudentSameDate],
        error: null,
      }),
    )
    const { result } = renderHook(() => useAttendance('2026-08'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const deleteBuilder = createQueryBuilder({ data: [entryA], error: null })
    mockFrom.mockReturnValueOnce(deleteBuilder)

    const response = await act(async () => result.current.deleteEntry('a1'))

    expect(deleteBuilder.eq).toHaveBeenCalledWith('id', 'a1')
    expect(response).toEqual({ data: entryA })
    expect(result.current.entries).toEqual([entryBSameStudentDifferentDate, entryCDifferentStudentSameDate])
  })

  it('reports an error instead of a silent no-op when zero rows are deleted (foreign or stale id)', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [entryA], error: null }))
    const { result } = renderHook(() => useAttendance('2026-08'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // RLS silently excludes rows the caller doesn't own — a delete on
    // someone else's record resolves with an empty array, not an error.
    const deleteBuilder = createQueryBuilder({ data: [], error: null })
    mockFrom.mockReturnValueOnce(deleteBuilder)

    const response = await act(async () => result.current.deleteEntry('not-mine'))

    expect(response).toEqual({ error: '기록을 찾을 수 없거나 삭제 권한이 없습니다.' })
    // entryA must survive untouched since nothing was actually deleted.
    expect(result.current.entries).toEqual([entryA])
  })

  it('updates neis_entered and document_received flags by record id', async () => {
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        data: [entryA, entryBSameStudentDifferentDate, entryCDifferentStudentSameDate],
        error: null,
      }),
    )
    const { result } = renderHook(() => useAttendance('2026-08'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const updatedEntryA = { ...entryA, neis_entered: true, document_received: true }
    const updateBuilder = createQueryBuilder({ data: [updatedEntryA], error: null })
    mockFrom.mockReturnValueOnce(updateBuilder)

    const response = await act(async () =>
      result.current.updateEntryFlags('a1', { neis_entered: true, document_received: true }),
    )

    expect(updateBuilder.update).toHaveBeenCalledWith({ neis_entered: true, document_received: true })
    expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'a1')
    expect(response).toEqual({ data: updatedEntryA })
    // Only entryA is replaced in place; near-miss rows for the same student
    // (different date) and same date (different student) are untouched.
    expect(result.current.entries).toEqual([
      updatedEntryA,
      entryBSameStudentDifferentDate,
      entryCDifferentStudentSameDate,
    ])
  })

  it('supports a partial patch — updating only neis_entered', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [entryA], error: null }))
    const { result } = renderHook(() => useAttendance('2026-08'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const updatedEntryA = { ...entryA, neis_entered: true }
    const updateBuilder = createQueryBuilder({ data: [updatedEntryA], error: null })
    mockFrom.mockReturnValueOnce(updateBuilder)

    await act(async () => result.current.updateEntryFlags('a1', { neis_entered: true }))

    expect(updateBuilder.update).toHaveBeenCalledWith({ neis_entered: true })
    expect(result.current.entries).toEqual([updatedEntryA])
  })

  it('reports an error instead of a silent no-op when zero rows are updated (foreign or stale id)', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [entryA], error: null }))
    const { result } = renderHook(() => useAttendance('2026-08'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // RLS silently excludes rows the caller doesn't own — an update on
    // someone else's record resolves with an empty array, not an error.
    const updateBuilder = createQueryBuilder({ data: [], error: null })
    mockFrom.mockReturnValueOnce(updateBuilder)

    const response = await act(async () => result.current.updateEntryFlags('not-mine', { neis_entered: true }))

    expect(response).toEqual({ error: '기록을 찾을 수 없거나 수정 권한이 없습니다.' })
    // entryA must survive untouched since nothing was actually updated.
    expect(result.current.entries).toEqual([entryA])
  })

  it('surfaces the error message when the update itself fails', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [entryA], error: null }))
    const { result } = renderHook(() => useAttendance('2026-08'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: null, error: { message: '네트워크 오류' } }))

    const response = await act(async () => result.current.updateEntryFlags('a1', { neis_entered: true }))

    expect(response).toEqual({ error: '네트워크 오류' })
    expect(result.current.error).toBe('네트워크 오류')
  })
})
