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

  it('shows writing status and the save action while a new record form is open', () => {
    render(
      <MemoryRouter initialEntries={['/students/s1']}>
        <Routes>
          <Route path="/students/:id" element={<StudentDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '기록 추가' }))

    expect(screen.queryByRole('button', { name: '기록 추가' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('기록 작성 중')
    expect(screen.getByRole('button', { name: '기록 저장' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument()
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

  it('does not show attendance summaries in the cumulative record page', () => {
    render(
      <MemoryRouter initialEntries={['/students/s1']}>
        <Routes>
          <Route path="/students/:id" element={<StudentDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.queryByText('결석 0')).not.toBeInTheDocument()
    expect(screen.queryByText('지각 0')).not.toBeInTheDocument()
  })
})
