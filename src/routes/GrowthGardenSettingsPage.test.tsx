import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GrowthGardenSettingsPage } from './GrowthGardenSettingsPage'

const mockGoalRefresh = vi.hoisted(() => vi.fn())
const mockGoalHook = vi.hoisted(() => ({
  goal: null,
  unlocks: [],
  loading: false,
  error: null as string | null,
  dataReady: true,
  refresh: mockGoalRefresh,
  saveGoal: vi.fn(),
}))

vi.mock('../lib/hooks/useStudents', () => ({ useStudents: () => ({ students: [], loading: false }) }))
vi.mock('../lib/hooks/useGrowthGarden', () => ({ useGrowthGarden: () => ({ summaryFor: () => ({ score: 0 }), loading: false }) }))
vi.mock('../lib/hooks/useClassGardenGoal', () => ({
  useClassGardenGoal: () => mockGoalHook,
}))
vi.mock('../lib/growth-garden/growthSettingsContext', () => ({
  useGrowthSettings: () => ({
    settings: { personal: [0, 3, 6, 10, 15, 20, 25, 30, 35, 40, 45], garden: [0, 3, 6, 10, 15] },
    save: vi.fn(), loading: false, error: null,
  }),
}))
vi.mock('../components/growth-garden/settings/ThresholdEditor', () => ({ ThresholdEditor: () => <button>저장</button> }))
vi.mock('../components/growth-garden/PlantIllustration', () => ({ PlantIllustration: () => <div /> }))
vi.mock('../components/growth-garden/GrowthFeedbackToast', () => ({ GrowthFeedbackToast: () => null }))

afterEach(() => {
  cleanup()
  mockGoalHook.error = null
  mockGoalHook.dataReady = true
  mockGoalRefresh.mockClear()
})

describe('GrowthGardenSettingsPage', () => {
  it('keeps shared garden navigation separate from threshold editor actions', () => {
    render(<MemoryRouter initialEntries={['/growth-garden/settings']}><GrowthGardenSettingsPage /></MemoryRouter>)

    expect(screen.getByTestId('settings-navigation-toolbar')).toContainElement(screen.getByRole('link', { name: '설정' }))
    expect(screen.getByTestId('settings-navigation-toolbar').compareDocumentPosition(screen.getAllByRole('button', { name: '저장' })[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('adds the month-aware class goal editor below the growth threshold settings', () => {
    render(<MemoryRouter initialEntries={['/growth-garden/settings']}><GrowthGardenSettingsPage /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: '학급 공동 목표' })).toBeInTheDocument()
    expect(screen.getByLabelText('목표 연도')).toBeInTheDocument()
    expect(screen.getByLabelText('목표 월')).toBeInTheDocument()
  })

  it('does not render an editable goal draft after goal data fails to load and offers retry', () => {
    mockGoalHook.error = '목표 조회 실패'
    mockGoalHook.dataReady = false
    render(<MemoryRouter initialEntries={['/growth-garden/settings']}><GrowthGardenSettingsPage /></MemoryRouter>)

    expect(screen.queryByRole('heading', { name: '학급 공동 목표' })).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('목표 조회 실패')
    screen.getByRole('button', { name: '공동 목표 다시 불러오기' }).click()
    expect(mockGoalRefresh).toHaveBeenCalledOnce()
  })
})
