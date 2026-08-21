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

const { useYorokColumns } = await import('./useYorokColumns')

const colA = { id: 'c1', teacher_id: 't1', label: '진로희망', type: 'text' as const, position: 0, created_at: 'x' }
const colB = { id: 'c2', teacher_id: 't1', label: '동아리', type: 'text' as const, position: 1, created_at: 'x' }

beforeEach(() => {
  mockFrom.mockReset()
  mockGetUser.mockReset()
})

describe('useYorokColumns', () => {
  it('fetches columns ordered by position', async () => {
    const builder = createQueryBuilder({ data: [colA, colB], error: null })
    mockFrom.mockReturnValue(builder)

    const { result } = renderHook(() => useYorokColumns())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(builder.order).toHaveBeenCalledWith('position', { ascending: true })
    expect(result.current.columns).toEqual([colA, colB])
  })

  it('adds a column with position = max existing + 1', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [colA, colB], error: null }))
    const { result } = renderHook(() => useYorokColumns())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetUser.mockResolvedValue({ data: { user: { id: 't1' } } })
    const colC = { id: 'c3', teacher_id: 't1', label: '봉사', type: 'checkbox' as const, position: 2, created_at: 'x' }
    const insertBuilder = createQueryBuilder({ data: colC, error: null })
    mockFrom.mockReturnValueOnce(insertBuilder)

    await act(async () => {
      await result.current.addColumn('봉사', 'checkbox')
    })

    expect(insertBuilder.insert).toHaveBeenCalledWith({
      label: '봉사',
      type: 'checkbox',
      position: 2,
      teacher_id: 't1',
    })
    expect(result.current.columns).toEqual([colA, colB, colC])
  })

  it('assigns position 0 when adding the first column', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [], error: null }))
    const { result } = renderHook(() => useYorokColumns())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetUser.mockResolvedValue({ data: { user: { id: 't1' } } })
    const insertBuilder = createQueryBuilder({ data: colA, error: null })
    mockFrom.mockReturnValueOnce(insertBuilder)

    await act(async () => {
      await result.current.addColumn('진로희망', 'text')
    })

    expect(insertBuilder.insert).toHaveBeenCalledWith({
      label: '진로희망',
      type: 'text',
      position: 0,
      teacher_id: 't1',
    })
  })

  it('deletes a column by id', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [colA, colB], error: null }))
    const { result } = renderHook(() => useYorokColumns())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const deleteBuilder = createQueryBuilder({ data: null, error: null })
    mockFrom.mockReturnValueOnce(deleteBuilder)

    await act(async () => {
      await result.current.deleteColumn('c1')
    })

    expect(deleteBuilder.eq).toHaveBeenCalledWith('id', 'c1')
    expect(result.current.columns).toEqual([colB])
  })

  it('surfaces the error message when fetch fails', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: { message: '네트워크 오류' } }))

    const { result } = renderHook(() => useYorokColumns())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('네트워크 오류')
  })

  it('renames a column by id', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [colA, colB], error: null }))
    const { result } = renderHook(() => useYorokColumns())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const renamedColA = { ...colA, label: '장래희망' }
    const updateBuilder = createQueryBuilder({ data: renamedColA, error: null })
    mockFrom.mockReturnValueOnce(updateBuilder)

    await act(async () => {
      await result.current.renameColumn('c1', '장래희망')
    })

    expect(updateBuilder.update).toHaveBeenCalledWith({ label: '장래희망' })
    expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'c1')
    // colB (untouched column) must survive unchanged.
    expect(result.current.columns).toEqual([renamedColA, colB])
  })

  it('reorders columns by writing sequential positions in the given order', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [colA, colB], error: null }))
    const { result } = renderHook(() => useYorokColumns())
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Swap: colB should move to position 0, colA to position 1.
    const movedColB = { ...colB, position: 0 }
    const movedColA = { ...colA, position: 1 }
    const updateBuilderB = createQueryBuilder({ data: movedColB, error: null })
    const updateBuilderA = createQueryBuilder({ data: movedColA, error: null })
    mockFrom.mockReturnValueOnce(updateBuilderB)
    mockFrom.mockReturnValueOnce(updateBuilderA)

    await act(async () => {
      await result.current.reorderColumns(['c2', 'c1'])
    })

    expect(updateBuilderB.update).toHaveBeenCalledWith({ position: 0 })
    expect(updateBuilderB.eq).toHaveBeenCalledWith('id', 'c2')
    expect(updateBuilderA.update).toHaveBeenCalledWith({ position: 1 })
    expect(updateBuilderA.eq).toHaveBeenCalledWith('id', 'c1')
    expect(result.current.columns).toEqual([movedColB, movedColA])
  })

  it('surfaces the error message when reordering fails', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [colA, colB], error: null }))
    const { result } = renderHook(() => useYorokColumns())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: null, error: { message: '네트워크 오류' } }))
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: { ...colA, position: 1 }, error: null }))

    const response = await act(async () => result.current.reorderColumns(['c2', 'c1']))

    expect(response).toEqual({ error: '네트워크 오류' })
    expect(result.current.error).toBe('네트워크 오류')
  })
})
