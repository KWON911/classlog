import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
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
vi.mock('../lib/hooks/useStudentAttendanceHistory', () => ({
  useStudentAttendanceHistory: () => ({
    entries: [{ id: 'a1', student_id: 's1', status: '결석', reason_category: '질병', note: '진료', date: '2026-09-01' }],
    loading: false,
    error: null,
  }),
}))

describe('AttendancePage', () => {
  it('shows a selected student’s cumulative attendance history in the personal-history tab', () => {
    render(
      <MemoryRouter>
        <AttendancePage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '개인별 이력' }))

    expect(screen.getByText('학생을 선택해 출결 이력을 확인하세요.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('학생 선택'), { target: { value: 's1' } })

    expect(screen.getByRole('heading', { name: '김학생 · 출결 이력' })).toBeInTheDocument()
    expect(screen.getByText('2026-09-01 · 질병결석')).toBeInTheDocument()
    expect(screen.getByText('진료')).toBeInTheDocument()
  })
})
