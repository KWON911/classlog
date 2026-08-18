import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRpc = vi.fn()

vi.mock('../supabaseClient', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

const { useAdminAccounts } = await import('./useAdminAccounts')

const account = {
  teacher_id: 'teacher-1',
  email: 'teacher@example.com',
  student_count: 3,
  record_count: 4,
  attendance_count: 5,
  seating_plan_count: 1,
  has_school_settings: true,
}

beforeEach(() => mockRpc.mockReset())

describe('useAdminAccounts', () => {
  it('loads the admin-visible account summaries', async () => {
    mockRpc.mockResolvedValue({ data: [account], error: null })

    const { result } = renderHook(() => useAdminAccounts())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockRpc).toHaveBeenCalledWith('list_managed_accounts')
    expect(result.current.accounts).toEqual([account])
  })

  it('resets the selected account then refreshes the summaries', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: [account], error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: [], error: null })

    const { result } = renderHook(() => useAdminAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.resetAccount('teacher-1')
    })

    expect(mockRpc).toHaveBeenCalledWith('reset_managed_account', { target_teacher_id: 'teacher-1' })
    expect(result.current.accounts).toEqual([])
  })
})
