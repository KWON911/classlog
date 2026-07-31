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

const { useStudents } = await import('./useStudents')

const studentNum1 = {
  id: '2',
  teacher_id: 't1',
  number: 1,
  name: '이서연',
  gender: null,
  student_phone: null,
  parent_phone: null,
  created_at: '2026-01-01',
}
const studentNum2 = {
  id: '1',
  teacher_id: 't1',
  number: 2,
  name: '김민준',
  gender: null,
  student_phone: null,
  parent_phone: null,
  created_at: '2026-01-01',
}

beforeEach(() => {
  mockFrom.mockReset()
  mockGetUser.mockReset()
})

describe('useStudents', () => {
  it('fetches students on mount', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: [studentNum1, studentNum2], error: null }))

    const { result } = renderHook(() => useStudents())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.students.map((s) => s.id)).toEqual(['2', '1'])
    expect(result.current.error).toBeNull()
  })

  it('surfaces the error message when fetch fails', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: { message: '네트워크 오류' } }))

    const { result } = renderHook(() => useStudents())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('네트워크 오류')
    expect(result.current.students).toEqual([])
  })

  it('adds a student and keeps the list sorted by number', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [studentNum2], error: null }))
    const { result } = renderHook(() => useStudents())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetUser.mockResolvedValue({ data: { user: { id: 't1' } } })
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: studentNum1, error: null }))

    await act(async () => {
      await result.current.addStudent({
        number: 1,
        name: '이서연',
        gender: null,
        student_phone: null,
        parent_phone: null,
      })
    })

    expect(result.current.students.map((s) => s.id)).toEqual(['2', '1'])
  })

  it('deletes a student', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [studentNum1, studentNum2], error: null }))
    const { result } = renderHook(() => useStudents())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: null, error: null }))

    await act(async () => {
      await result.current.deleteStudent('2')
    })

    expect(result.current.students.map((s) => s.id)).toEqual(['1'])
  })
})
