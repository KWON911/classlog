import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GrowthGardenReportPage } from './GrowthGardenReportPage'

const { mockUseClassGardenGoal } = vi.hoisted(() => ({
  mockUseClassGardenGoal: vi.fn((year: number, month: number) => ({
    goal: {
      id: `goal-${year}-${month}`,
      teacher_id: 'teacher-1',
      year,
      month,
      target_point: 300,
      milestones: [
        { point: 100, decorationType: 'pond' },
        { point: 200, decorationType: 'big_tree' },
        { point: 300, decorationType: 'garden_lamp' },
      ],
      created_at: '',
      updated_at: '',
    },
    progress: { score: 150 },
    unlocks: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
    saveGoal: vi.fn(),
  })),
}))

vi.mock('../lib/hooks/useStudents', () => ({
  useStudents: () => ({
    students: [{ id: 'student-1', teacher_id: 'teacher-1', number: 1, name: '가람', gender: null, birthdate: null, student_phone: null, address: null, father_name: null, father_phone: null, mother_name: null, mother_phone: null, emergency_contact: null, note: null, created_at: '' }],
    loading: false,
  }),
}))
vi.mock('../lib/hooks/useClassGardenGoal', () => ({ useClassGardenGoal: mockUseClassGardenGoal }))
vi.mock('../lib/hooks/useMonthlyReport', () => ({
  useMonthlyReport: () => ({ loading: false, error: null, classReport: {}, growthRanking: [], studentReportFor: () => null }),
}))
vi.mock('../lib/hooks/useRewards', () => ({
  useRewards: () => ({ classRewards: [], rewardsForStudent: () => [], loading: false, saving: false, error: null, createReward: vi.fn(), deleteReward: vi.fn() }),
}))
vi.mock('../lib/hooks/useMonthlyAwards', () => ({
  useMonthlyAwards: () => ({ awards: [], loading: false, saving: false, error: null, createAward: vi.fn(), updateAward: vi.fn(), deleteAward: vi.fn() }),
}))
vi.mock('../components/growth-garden/report/ClassMonthlyReportView', () => ({ ClassMonthlyReportView: () => <div /> }))
vi.mock('../components/growth-garden/report/StudentMonthlyReportView', () => ({ StudentMonthlyReportView: () => <div /> }))
vi.mock('../components/growth-garden/awards/MonthlyAwardModal', () => ({ MonthlyAwardModal: () => null }))
vi.mock('../components/growth-garden/awards/MonthlyAwardCelebration', () => ({ MonthlyAwardCelebration: () => null }))
vi.mock('../components/growth-garden/GrowthFeedbackToast', () => ({ GrowthFeedbackToast: () => null }))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  mockUseClassGardenGoal.mockClear()
})

describe('GrowthGardenReportPage', () => {
  it('separates shared navigation from month and report type controls', () => {
    render(<MemoryRouter initialEntries={['/growth-garden/report']}><GrowthGardenReportPage /></MemoryRouter>)

    expect(screen.getByTestId('report-navigation-toolbar')).toContainElement(screen.getByRole('link', { name: '월별 리포트' }))
    expect(screen.getByTestId('report-display-toolbar')).toContainElement(screen.getByRole('group', { name: '리포트 종류' }))
    expect(screen.getByTestId('report-display-toolbar')).toContainElement(screen.getByRole('button', { name: '이전 달' }))
  })

  it('loads a class goal independently for the selected historical report month', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 2))
    render(<MemoryRouter initialEntries={['/growth-garden/report']}><GrowthGardenReportPage /></MemoryRouter>)

    expect(mockUseClassGardenGoal).toHaveBeenLastCalledWith(2026, 9)
    fireEvent.click(screen.getByRole('button', { name: '이전 달' }))

    expect(mockUseClassGardenGoal).toHaveBeenLastCalledWith(2026, 8)
    expect(screen.getByText('8월 우리 반 공동 목표')).toBeInTheDocument()
  })
})
