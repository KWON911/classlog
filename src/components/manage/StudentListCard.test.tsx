import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StudentListCard } from './StudentListCard'

afterEach(cleanup)

describe('StudentListCard', () => {
  it('renders student actions in a responsive roster-chip grid', () => {
    const { container } = render(
      <StudentListCard
        students={[{
          id: 's1', teacher_id: 't1', number: 1, name: '김민서', gender: '여', birthdate: null,
          student_phone: null, address: null, father_name: null, father_phone: null, mother_name: null,
          mother_phone: null, emergency_contact: null, note: null, created_at: '2026-09-09T00:00:00Z',
        }]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        addStudent={vi.fn()}
        updateStudent={vi.fn()}
        deleteStudent={vi.fn()}
        addStudents={vi.fn()}
        deleteAllStudents={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '개별 추가' })).toBeInTheDocument()
    expect(screen.getByText('김민서')).toBeInTheDocument()
    expect(screen.getByLabelText('김민서 학생 관리 메뉴')).toBeInTheDocument()
    expect(container.querySelector('ul')).toHaveClass('grid', 'grid-cols-1', '@md:grid-cols-2', '@3xl:grid-cols-3')
    expect(container.querySelector('li')).toHaveClass('flex', 'min-h-[52px]', '@md:h-11')
  })
})
