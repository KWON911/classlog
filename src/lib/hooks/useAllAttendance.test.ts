import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createQueryBuilder } from '../../test/supabaseMock'

const mockFrom = vi.fn()

vi.mock('../supabaseClient', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}))

const { useAllAttendance } = await import('./useAllAttendance')

describe('useAllAttendance', () => {
  beforeEach(() => mockFrom.mockReset())

  it('loads all attendance entries in newest-first order only when enabled', async () => {
    const builder = createQueryBuilder({ data: [{ id: 'a1', date: '2026-09-01' }], error: null })
    mockFrom.mockReturnValue(builder)

    const { result } = renderHook(() => useAllAttendance(true))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockFrom).toHaveBeenCalledWith('attendance')
    expect(builder.order).toHaveBeenCalledWith('date', { ascending: false })
    expect(result.current.entries).toEqual([{ id: 'a1', date: '2026-09-01' }])
  })

  it('does not request entries while disabled', async () => {
    const { result } = renderHook(() => useAllAttendance(false))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockFrom).not.toHaveBeenCalled()
  })
})
