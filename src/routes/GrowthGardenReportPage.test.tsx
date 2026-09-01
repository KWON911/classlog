import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GrowthGardenReportPage } from './GrowthGardenReportPage'

vi.mock('../lib/hooks/useStudents', () => ({
  useStudents: () => ({ students: [], loading: false }),
}))
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

afterEach(cleanup)

describe('GrowthGardenReportPage', () => {
  it('separates shared navigation from month and report type controls', () => {
    render(<MemoryRouter initialEntries={['/growth-garden/report']}><GrowthGardenReportPage /></MemoryRouter>)

    expect(screen.getByTestId('report-navigation-toolbar')).toContainElement(screen.getByRole('link', { name: '월별 리포트' }))
    expect(screen.getByTestId('report-display-toolbar')).toContainElement(screen.getByRole('group', { name: '리포트 종류' }))
    expect(screen.getByTestId('report-display-toolbar')).toContainElement(screen.getByRole('button', { name: '이전 달' }))
  })
})
