import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createQueryBuilder } from '../../test/supabaseMock'

const mockFrom = vi.fn()

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

const { useRecordCounts } = await import('./useRecordCounts')

beforeEach(() => {
  mockFrom.mockReset()
})

describe('useRecordCounts', () => {
  it('fetches on mount and groups counts by student_id', async () => {
    const rows = [
      { student_id: 's-1' },
      { student_id: 's-2' },
      { student_id: 's-1' },
      { student_id: 's-1' },
    ]
    const builder = createQueryBuilder({ data: rows, error: null })
    mockFrom.mockReturnValue(builder)

    const { result } = renderHook(() => useRecordCounts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockFrom).toHaveBeenCalledWith('records')
    expect(builder.select).toHaveBeenCalledWith('student_id')
    expect(result.current.counts.get('s-1')).toBe(3)
    expect(result.current.counts.get('s-2')).toBe(1)
    expect(result.current.counts.get('s-missing')).toBeUndefined()
    expect(result.current.error).toBe(null)
  })

  it('pages through more than one page of results and accumulates counts across pages', async () => {
    const page1 = Array.from({ length: 1000 }, () => ({ student_id: 's-1' }))
    const page2 = [{ student_id: 's-1' }, { student_id: 's-2' }]
    const builder1 = createQueryBuilder({ data: page1, error: null })
    const builder2 = createQueryBuilder({ data: page2, error: null })
    mockFrom.mockReturnValueOnce(builder1).mockReturnValueOnce(builder2)

    const { result } = renderHook(() => useRecordCounts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(builder1.range).toHaveBeenCalledWith(0, 999)
    expect(builder2.range).toHaveBeenCalledWith(1000, 1999)
    expect(result.current.counts.get('s-1')).toBe(1001)
    expect(result.current.counts.get('s-2')).toBe(1)
  })

  it('surfaces the error message when fetch fails', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: '네트워크 오류' } })
    mockFrom.mockReturnValue(builder)

    const { result } = renderHook(() => useRecordCounts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('네트워크 오류')
    expect(result.current.counts.size).toBe(0)
  })
})
