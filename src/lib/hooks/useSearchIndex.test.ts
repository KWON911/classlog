import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createQueryBuilder } from '../../test/supabaseMock'

const mockFrom = vi.fn()

vi.mock('../supabaseClient', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}))

const { useSearchIndex } = await import('./useSearchIndex')

beforeEach(() => {
  mockFrom.mockReset()
})

describe('useSearchIndex', () => {
  it('fetches records and attendance in parallel with the expected columns', async () => {
    const recordsBuilder = createQueryBuilder({ data: [], error: null })
    const attendanceBuilder = createQueryBuilder({ data: [], error: null })
    mockFrom.mockImplementation((table: string) => (table === 'records' ? recordsBuilder : attendanceBuilder))

    const { result } = renderHook(() => useSearchIndex())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockFrom).toHaveBeenCalledWith('records')
    expect(mockFrom).toHaveBeenCalledWith('attendance')
    expect(recordsBuilder.select).toHaveBeenCalledWith('id, student_id, category, content, record_date')
    expect(attendanceBuilder.select).toHaveBeenCalledWith('id, student_id, status, reason_category, note, date')
  })

  it('returns records and attendance on success', async () => {
    const record = { id: 'r1', student_id: 's1', category: '생활지도', content: '지각 지도', record_date: '2026-08-01' }
    const entry = { id: 'a1', student_id: 's1', status: '결석', reason_category: '질병', note: '감기', date: '2026-08-20' }
    mockFrom.mockImplementation((table: string) =>
      table === 'records'
        ? createQueryBuilder({ data: [record], error: null })
        : createQueryBuilder({ data: [entry], error: null }),
    )

    const { result } = renderHook(() => useSearchIndex())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.records).toEqual([record])
    expect(result.current.attendance).toEqual([entry])
    expect(result.current.error).toBeNull()
  })

  it('keeps the successful group when the other fails, and surfaces the error message', async () => {
    mockFrom.mockImplementation((table: string) =>
      table === 'records'
        ? createQueryBuilder({ data: null, error: { message: '레코드 조회 실패' } })
        : createQueryBuilder({
            data: [{ id: 'a1', student_id: 's1', status: '결석', reason_category: '질병', note: null, date: '2026-08-20' }],
            error: null,
          }),
    )

    const { result } = renderHook(() => useSearchIndex())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.records).toEqual([])
    expect(result.current.attendance).toHaveLength(1)
    expect(result.current.error).toBe('레코드 조회 실패')
  })
})
