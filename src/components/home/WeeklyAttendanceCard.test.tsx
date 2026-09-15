import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { attendanceDatePath } from '../../lib/utils/weeklyAttendance'
import { WeeklyAttendanceCard } from './WeeklyAttendanceCard'

vi.mock('../../lib/hooks/useWeeklyAttendance', () => ({
  useWeeklyAttendance: () => ({
    data: [
      {
        id: 'attendance-1',
        student_id: 'student-1',
        teacher_id: 'teacher-1',
        date: '2026-09-14',
        status: '결석',
        reason_category: '질병',
        note: null,
        created_at: '2026-09-14T00:00:00.000Z',
        neis_entered: false,
        document_received: false,
        students: { number: 1, name: '김학생' },
      },
    ],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

afterEach(cleanup)

describe('attendanceDatePath', () => {
  it('creates a daily attendance URL for the selected weekday', () => {
    expect(attendanceDatePath('20260915')).toBe('/attendance?date=20260915')
  })
})

describe('WeeklyAttendanceCard', () => {
  it('provides a date-only link for each weekday box', () => {
    render(
      <MemoryRouter>
        <WeeklyAttendanceCard weekStart={new Date(2026, 8, 14)} refreshToken={0} isCurrentWeek={false} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: '월 9/14 출결 수정' })).toHaveAttribute('href', '/attendance?date=20260914')
  })

  it('keeps the student badge link targeted to that student', () => {
    render(
      <MemoryRouter>
        <WeeklyAttendanceCard weekStart={new Date(2026, 8, 14)} refreshToken={0} isCurrentWeek={false} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: '1번 김학생 결석' })).toHaveAttribute(
      'href',
      '/attendance?date=20260914&student=student-1',
    )
  })
})
