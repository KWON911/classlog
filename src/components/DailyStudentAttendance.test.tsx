import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DailyStudentAttendance } from './DailyStudentAttendance'

const student = {
  id: 's1', teacher_id: 't1', number: 1, name: '김민서', gender: null, birthdate: null,
  student_phone: null, address: null, father_name: null, father_phone: null, mother_name: null,
  mother_phone: null, emergency_contact: null, note: null, created_at: '2026-09-09T00:00:00Z',
}

const props = {
  students: [student],
  entries: [],
  loading: false,
  events: [],
  upsertEntry: vi.fn(),
  clearEntry: vi.fn(),
}

describe('DailyStudentAttendance', () => {
  it('keeps the changed-students filter enabled when selecting a different date', () => {
    const { rerender } = render(<DailyStudentAttendance {...props} selectedDate="2026-09-09" />)
    const checkbox = screen.getByLabelText('변경 학생만 보기')

    fireEvent.click(checkbox)
    rerender(<DailyStudentAttendance {...props} selectedDate="2026-09-10" />)

    expect(screen.getByLabelText('변경 학생만 보기')).toBeChecked()
  })
})
