import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AttendancePage } from './AttendancePage'

vi.mock('../lib/hooks/useStudents', () => ({
  useStudents: () => ({
    students: [{ id: 's1', number: 1, name: '김학생' }],
    error: null,
  }),
}))

vi.mock('../lib/hooks/useAttendance', () => ({
  useAttendance: () => ({
    entries: [{ id: 'a1', student_id: 's1', status: '결석', reason_category: '질병', date: '2026-09-01' }],
    loading: false,
    error: null,
    upsertEntry: vi.fn(),
    clearEntry: vi.fn(),
    deleteEntry: vi.fn(),
    updateEntryFlags: vi.fn(),
  }),
}))

vi.mock('../lib/hooks/useSchoolSettings', () => ({ useSchoolSettings: () => ({ settings: null }) }))
vi.mock('../lib/hooks/useSchoolEvents', () => ({ useSchoolEvents: () => ({ eventsByDate: {}, status: 'idle' }) }))
vi.mock('../lib/hooks/useAllAttendance', () => ({
  useAllAttendance: () => ({ entries: [], loading: false, error: null }),
}))

afterEach(cleanup)

describe('AttendancePage', () => {
  it('combines monthly and cumulative views under the attendance summary tab', () => {
    render(
      <MemoryRouter>
        <AttendancePage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '출결 요약' }))

    expect(screen.getByRole('button', { name: '선택 월' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '전체 누적' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '개인별 이력' })).not.toBeInTheDocument()
  })

  it('provides an explicit all-students control after filtering to students with records', () => {
    render(
      <MemoryRouter>
        <AttendancePage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '출결 요약' }))
    fireEvent.click(screen.getByRole('button', { name: '기록 있음 1' }))

    expect(screen.getByRole('button', { name: '전체 보기 1' })).toBeInTheDocument()
  })
})
