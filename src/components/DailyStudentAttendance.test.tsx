import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
  saveAttendanceRange: vi.fn().mockResolvedValue({}),
  clearEntry: vi.fn(),
}

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('DailyStudentAttendance', () => {
  it('shows records only and saves a single day through the unified form', async () => {
    render(<DailyStudentAttendance {...props} selectedDate="2026-09-09" />)
    expect(screen.queryByLabelText('예외 학생만 보기')).not.toBeInTheDocument()
    expect(screen.queryByText(student.name)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '출결 입력' }))
    fireEvent.change(screen.getByLabelText('학생'), { target: { value: 's1' } })
    fireEvent.click(screen.getByRole('button', { name: '출결 저장 · 1일 결석' }))
    await waitFor(() => expect(props.saveAttendanceRange).toHaveBeenCalledWith('s1', ['2026-09-09'], { status: '결석', reason_category: '질병', note: null }, false))
    await waitFor(() => expect(screen.getByLabelText('학생')).toHaveValue(''))
  })

  it('excludes the weekend and unchecked school days from a range', async () => {
    render(<DailyStudentAttendance {...props} selectedDate="2026-10-16" />)
    fireEvent.click(screen.getByRole('button', { name: '출결 입력' }))
    fireEvent.change(screen.getByLabelText('학생'), { target: { value: 's1' } })
    fireEvent.change(screen.getByLabelText('종료일'), { target: { value: '2026-10-20' } })
    fireEvent.click(screen.getByLabelText('10-19'))
    fireEvent.change(screen.getByLabelText('출결 상태'), { target: { value: '지각' } })
    fireEvent.click(screen.getByRole('button', { name: '출결 저장 · 2일 지각' }))
    await waitFor(() => expect(props.saveAttendanceRange).toHaveBeenCalledWith('s1', ['2026-10-16', '2026-10-20'], { status: '지각', reason_category: '질병', note: null }, false))
  })

  it('requires explicit confirmation to change existing records', async () => {
    props.saveAttendanceRange.mockResolvedValueOnce({ conflicts: ['2026-09-09'] })
    render(<DailyStudentAttendance {...props} selectedDate="2026-09-09" />)
    fireEvent.click(screen.getByRole('button', { name: '출결 입력' }))
    fireEvent.change(screen.getByLabelText('학생'), { target: { value: 's1' } })
    fireEvent.click(screen.getByRole('button', { name: '출결 저장 · 1일 결석' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('기존 기록 1건이 변경됩니다')
    expect(props.saveAttendanceRange).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: '기존 기록 변경 후 저장' }))
    await waitFor(() => expect(props.saveAttendanceRange).toHaveBeenLastCalledWith('s1', ['2026-09-09'], { status: '결석', reason_category: '질병', note: null }, true))
  })
})
