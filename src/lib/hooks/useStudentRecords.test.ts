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

const { useStudentRecords } = await import('./useStudentRecords')

const record1 = {
  id: 'r1',
  student_id: 's1',
  teacher_id: 't1',
  category: '생활지도' as const,
  content: '친구와 다툼 중재',
  record_date: '2026-03-10',
  created_at: '2026-03-10',
}
const record2 = {
  id: 'r2',
  student_id: 's1',
  teacher_id: 't1',
  category: '학습' as const,
  content: '수학 보충 필요',
  record_date: '2026-03-15',
  created_at: '2026-03-15',
}

beforeEach(() => {
  mockFrom.mockReset()
  mockGetUser.mockReset()
})

describe('useStudentRecords', () => {
  it('fetches records for the given student on mount', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: [record2, record1], error: null }))

    const { result } = renderHook(() => useStudentRecords('s1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.records.map((r) => r.id)).toEqual(['r2', 'r1'])
  })

  it('surfaces the error message when fetch fails', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: { message: '네트워크 오류' } }))

    const { result } = renderHook(() => useStudentRecords('s1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('네트워크 오류')
  })

  it('adds a record and keeps newest-first order', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [record1], error: null }))
    const { result } = renderHook(() => useStudentRecords('s1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetUser.mockResolvedValue({ data: { user: { id: 't1' } } })
    const newRecord = {
      id: 'r3',
      student_id: 's1',
      teacher_id: 't1',
      category: '진로' as const,
      content: '장래희망 상담',
      record_date: '2026-03-20',
      created_at: '2026-03-20',
    }
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: newRecord, error: null }))

    await act(async () => {
      await result.current.addRecord({ category: '진로', content: '장래희망 상담', record_date: '2026-03-20' })
    })

    expect(result.current.records.map((r) => r.id)).toEqual(['r3', 'r1'])
  })

  it('removes a record on delete', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [record2, record1], error: null }))
    const { result } = renderHook(() => useStudentRecords('s1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: null, error: null }))

    await act(async () => {
      await result.current.deleteRecord('r1')
    })

    expect(result.current.records.map((r) => r.id)).toEqual(['r2'])
  })
})
