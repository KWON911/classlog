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

const { useSchoolSettings } = await import('./useSchoolSettings')

const settingsRow = {
  teacher_id: 't1',
  office_code: 'E10',
  school_code: '7341401',
  school_name: '인천예송초등학교',
  school_year: '2026',
  grade: '6',
  class_name: '1',
  updated_at: '2026-08-01T00:00:00Z',
}

beforeEach(() => {
  mockFrom.mockReset()
  mockGetUser.mockReset()
})

describe('useSchoolSettings', () => {
  it('fetches the saved settings row on mount', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: settingsRow, error: null }))

    const { result } = renderHook(() => useSchoolSettings())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.settings).toEqual(settingsRow)
  })

  it('resolves to null settings when nothing has been saved yet', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: null }))

    const { result } = renderHook(() => useSchoolSettings())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.settings).toBeNull()
  })

  it('surfaces the error message when fetch fails', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: { message: '네트워크 오류' } }))

    const { result } = renderHook(() => useSchoolSettings())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('네트워크 오류')
  })

  it('saves settings with the current teacher id', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: null, error: null }))
    const { result } = renderHook(() => useSchoolSettings())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetUser.mockResolvedValue({ data: { user: { id: 't1' } } })
    const upsertBuilder = createQueryBuilder({ data: settingsRow, error: null })
    mockFrom.mockReturnValueOnce(upsertBuilder)

    const { teacher_id, updated_at, ...input } = settingsRow
    await act(async () => {
      await result.current.saveSettings(input)
    })

    expect(upsertBuilder.upsert).toHaveBeenCalledWith({ ...input, teacher_id: 't1' }, { onConflict: 'teacher_id' })
    expect(result.current.settings).toEqual(settingsRow)
  })

  it('returns an error and skips the write when the user is not logged in', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: null, error: null }))
    const { result } = renderHook(() => useSchoolSettings())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { teacher_id, updated_at, ...input } = settingsRow
    const response = await act(async () => result.current.saveSettings(input))

    expect(response).toEqual({ error: '로그인이 필요합니다.' })
  })
})
