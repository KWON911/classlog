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

const { useYorokEntries } = await import('./useYorokEntries')

const entryA = {
  id: 'e1',
  student_id: 's1',
  teacher_id: 't1',
  values: { c1: '적극적인 학생', c2: true },
  created_at: 'x',
}
const entryB = {
  id: 'e2',
  student_id: 's2',
  teacher_id: 't1',
  values: {},
  created_at: 'x',
}

beforeEach(() => {
  mockFrom.mockReset()
  mockGetUser.mockReset()
})

describe('useYorokEntries', () => {
  it('fetches all entries', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: [entryA, entryB], error: null }))

    const { result } = renderHook(() => useYorokEntries())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.entries).toEqual([entryA, entryB])
  })

  it('upserts full merged values with onConflict on student_id, only replacing that student', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [entryA, entryB], error: null }))
    const { result } = renderHook(() => useYorokEntries())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetUser.mockResolvedValue({ data: { user: { id: 't1' } } })
    const updatedEntryA = { ...entryA, values: { c1: '수정된 내용', c2: false } }
    const upsertBuilder = createQueryBuilder({ data: updatedEntryA, error: null })
    mockFrom.mockReturnValueOnce(upsertBuilder)

    await act(async () => {
      await result.current.saveEntryValues('s1', { c1: '수정된 내용', c2: false })
    })

    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      { student_id: 's1', teacher_id: 't1', values: { c1: '수정된 내용', c2: false } },
      { onConflict: 'student_id' },
    )
    // entryB (a different student) must survive untouched; entryA is replaced.
    expect(result.current.entries).toEqual([entryB, updatedEntryA])
  })

  it('creates a new entry row for a student with no prior entry', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [], error: null }))
    const { result } = renderHook(() => useYorokEntries())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetUser.mockResolvedValue({ data: { user: { id: 't1' } } })
    const newEntry = { id: 'e3', student_id: 's3', teacher_id: 't1', values: { c1: '신규' }, created_at: 'x' }
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: newEntry, error: null }))

    await act(async () => {
      await result.current.saveEntryValues('s3', { c1: '신규' })
    })

    expect(result.current.entries).toEqual([newEntry])
  })

  it('returns an error and does not touch state when not authenticated', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [entryA], error: null }))
    const { result } = renderHook(() => useYorokEntries())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetUser.mockResolvedValue({ data: { user: null } })

    const response = await act(async () => result.current.saveEntryValues('s1', { c1: 'x' }))

    expect(response).toEqual({ error: '로그인이 필요합니다.' })
    expect(result.current.entries).toEqual([entryA])
  })

  it('surfaces the error message when the upsert fails', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [entryA], error: null }))
    const { result } = renderHook(() => useYorokEntries())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetUser.mockResolvedValue({ data: { user: { id: 't1' } } })
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: null, error: { message: '네트워크 오류' } }))

    const response = await act(async () => result.current.saveEntryValues('s1', { c1: 'x' }))

    expect(response).toEqual({ error: '네트워크 오류' })
    expect(result.current.error).toBe('네트워크 오류')
  })
})
