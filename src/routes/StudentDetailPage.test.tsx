import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StudentDetailPage } from './StudentDetailPage'

vi.mock('../lib/hooks/useStudents', () => ({
  useStudents: () => ({
    students: [{ id: 's1', number: 1, name: '김학생' }],
    loading: false,
    error: null,
  }),
}))

vi.mock('../lib/hooks/useStudentRecords', () => ({
  useStudentRecords: () => ({
    records: [],
    loading: false,
    error: null,
    addRecord: vi.fn(),
    updateRecord: vi.fn(),
    deleteRecord: vi.fn(),
  }),
}))

vi.mock('../lib/hooks/useAttendanceSummary', () => ({
  useAttendanceSummary: () => ({
    summary: { 결석: 0, 지각: 0, 조퇴: 0, 결과: 0 },
    error: null,
  }),
}))

afterEach(cleanup)

describe('StudentDetailPage', () => {
  it('uses the selected timeline category as the default for a new record', () => {
    render(
      <MemoryRouter initialEntries={['/students/s1']}>
        <Routes>
          <Route path="/students/:id" element={<StudentDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '학습' }))
    fireEvent.click(screen.getByRole('button', { name: '기록 추가' }))

    expect(screen.getByLabelText('카테고리')).toHaveValue('학습')
  })

  it('keeps 생활지도 as the default when the all filter is selected', () => {
    render(
      <MemoryRouter initialEntries={['/students/s1']}>
        <Routes>
          <Route path="/students/:id" element={<StudentDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '기록 추가' }))

    expect(screen.getByLabelText('카테고리')).toHaveValue('생활지도')
  })

  it('opens the record guide from the help button', () => {
    render(
      <MemoryRouter initialEntries={['/students/s1']}>
        <Routes>
          <Route path="/students/:id" element={<StudentDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '누가기록 도움말 보기' }))

    expect(screen.getByText('Google Form으로 누가기록 남기기')).toBeInTheDocument()
    expect(screen.getByText('새 학년도에 학생이 바뀌면')).toBeInTheDocument()
  })
})
