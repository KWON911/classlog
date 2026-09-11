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
    entries: [],
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
})
