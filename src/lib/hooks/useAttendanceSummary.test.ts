import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createQueryBuilder } from '../../test/supabaseMock'

const mockFrom = vi.fn()

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

const { useAttendanceSummary } = await import('./useAttendanceSummary')

beforeEach(() => {
  mockFrom.mockReset()
})

describe('useAttendanceSummary', () => {
  it('counts each status from a mixed, unsorted fixture', async () => {
    const builder = createQueryBuilder({
      data: [{ status: '지각' }, { status: '결석' }, { status: '결석' }, { status: '조퇴' }],
      error: null,
    })
    mockFrom.mockReturnValue(builder)

    const { result } = renderHook(() => useAttendanceSummary('s1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(builder.eq).toHaveBeenCalledWith('student_id', 's1')
    expect(result.current.summary).toEqual({ 결석: 2, 지각: 1, 조퇴: 1, 결과: 0 })
  })

  it('returns all-zero counts when the student has no attendance rows', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: [], error: null }))

    const { result } = renderHook(() => useAttendanceSummary('s1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.summary).toEqual({ 결석: 0, 지각: 0, 조퇴: 0, 결과: 0 })
  })

  it('surfaces the error message when fetch fails', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: { message: '네트워크 오류' } }))

    const { result } = renderHook(() => useAttendanceSummary('s1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('네트워크 오류')
  })
})
