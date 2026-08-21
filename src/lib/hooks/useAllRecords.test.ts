import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { createQueryBuilder } from '../../test/supabaseMock'

const mockFrom = vi.fn()

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

const { useAllRecords } = await import('./useAllRecords')

beforeEach(() => {
  mockFrom.mockReset()
})

describe('useAllRecords', () => {
  it('does not fetch on mount', () => {
    renderHook(() => useAllRecords())
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('fetches all records across students on demand', async () => {
    const records = [
      {
        id: 'r1',
        student_id: 's-1',
        teacher_id: 't1',
        category: '학습',
        content: 'a',
        record_date: '2026-01-01',
        created_at: '2026-01-01T00:00:00Z',
      },
    ]
    const builder = createQueryBuilder({ data: records, error: null })
    mockFrom.mockReturnValue(builder)

    const { result } = renderHook(() => useAllRecords())

    let response: { data?: unknown[]; error?: string } | undefined
    await act(async () => {
      response = await result.current.fetchAllRecords()
    })

    expect(mockFrom).toHaveBeenCalledWith('records')
    expect(builder.select).toHaveBeenCalledWith('*')
    expect(response).toEqual({ data: records })
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(null)
  })

  it('surfaces the error message when fetch fails', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: '네트워크 오류' } })
    mockFrom.mockReturnValue(builder)

    const { result } = renderHook(() => useAllRecords())

    let response: { data?: unknown[]; error?: string } | undefined
    await act(async () => {
      response = await result.current.fetchAllRecords()
    })

    expect(response).toEqual({ error: '네트워크 오류' })
    expect(result.current.error).toBe('네트워크 오류')
  })

  it('pages through more than one page of results and accumulates them all', async () => {
    const page1 = Array.from({ length: 1000 }, (_, i) => ({
      id: `r${i}`,
      student_id: 's-1',
      teacher_id: 't1',
      category: '학습',
      content: `record ${i}`,
      record_date: '2026-01-01',
      created_at: '2026-01-01T00:00:00Z',
    }))
    const page2 = [
      {
        id: 'r-last',
        student_id: 's-1',
        teacher_id: 't1',
        category: '학습',
        content: 'last record',
        record_date: '2026-01-02',
        created_at: '2026-01-02T00:00:00Z',
      },
    ]
    const builder1 = createQueryBuilder({ data: page1, error: null })
    const builder2 = createQueryBuilder({ data: page2, error: null })
    mockFrom.mockReturnValueOnce(builder1).mockReturnValueOnce(builder2)

    const { result } = renderHook(() => useAllRecords())

    let response: { data?: unknown[]; error?: string } | undefined
    await act(async () => {
      response = await result.current.fetchAllRecords()
    })

    expect(builder1.range).toHaveBeenCalledWith(0, 999)
    expect(builder2.range).toHaveBeenCalledWith(1000, 1999)
    expect(response?.data).toHaveLength(1001)
  })
})
