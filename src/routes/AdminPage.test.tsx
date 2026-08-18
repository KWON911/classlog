import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUseAuth = vi.fn()
const mockUseAdminAccounts = vi.fn()

vi.mock('../lib/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../lib/hooks/useAdminAccounts', () => ({
  useAdminAccounts: (...args: unknown[]) => mockUseAdminAccounts(...args),
}))

const { AdminPage } = await import('./AdminPage')

const accounts = [
  {
    teacher_id: 'teacher-1',
    email: 'teacher-one@example.com',
    student_count: 0,
    record_count: 0,
    attendance_count: 0,
    seating_plan_count: 0,
    has_school_settings: false,
  },
  {
    teacher_id: 'teacher-2',
    email: 'teacher-two@example.com',
    student_count: 0,
    record_count: 0,
    attendance_count: 0,
    seating_plan_count: 0,
    has_school_settings: false,
  },
]

beforeEach(() => {
  mockUseAuth.mockReturnValue({ session: { user: { email: 'dosung83@gmail.com' } }, loading: false })
  mockUseAdminAccounts.mockReturnValue({ accounts, loading: false, error: null, resetAccount: vi.fn() })
})

describe('AdminPage', () => {
  it('requires a new confirmation after cancelling a different account reset', () => {
    render(<AdminPage />)

    fireEvent.click(screen.getAllByRole('button', { name: '데이터 초기화' })[0])
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '초기화' } })
    expect(screen.getByRole('button', { name: '영구 삭제' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    fireEvent.click(screen.getAllByRole('button', { name: '데이터 초기화' })[1])

    expect(screen.getByRole('textbox')).toHaveValue('')
    expect(screen.getByRole('button', { name: '영구 삭제' })).toBeDisabled()
  })

  it('explains when there are no accounts to reset', () => {
    mockUseAdminAccounts.mockReturnValue({ accounts: [], loading: false, error: null, resetAccount: vi.fn() })

    render(<AdminPage />)

    expect(screen.getByText('초기화할 계정이 없습니다.')).toBeInTheDocument()
  })
})
