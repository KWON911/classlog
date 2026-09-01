import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GrowthGardenSettingsPage } from './GrowthGardenSettingsPage'

vi.mock('../lib/hooks/useStudents', () => ({ useStudents: () => ({ students: [], loading: false }) }))
vi.mock('../lib/hooks/useGrowthGarden', () => ({ useGrowthGarden: () => ({ summaryFor: () => ({ score: 0 }), loading: false }) }))
vi.mock('../lib/growth-garden/growthSettingsContext', () => ({
  useGrowthSettings: () => ({
    settings: { personal: [0, 3, 6, 10, 15, 20, 25, 30, 35, 40, 45], garden: [0, 3, 6, 10, 15] },
    save: vi.fn(), loading: false, error: null,
  }),
}))
vi.mock('../components/growth-garden/settings/ThresholdEditor', () => ({ ThresholdEditor: () => <button>저장</button> }))
vi.mock('../components/growth-garden/PlantIllustration', () => ({ PlantIllustration: () => <div /> }))
vi.mock('../components/growth-garden/GrowthFeedbackToast', () => ({ GrowthFeedbackToast: () => null }))

afterEach(cleanup)

describe('GrowthGardenSettingsPage', () => {
  it('keeps shared garden navigation separate from threshold editor actions', () => {
    render(<MemoryRouter initialEntries={['/growth-garden/settings']}><GrowthGardenSettingsPage /></MemoryRouter>)

    expect(screen.getByTestId('settings-navigation-toolbar')).toContainElement(screen.getByRole('link', { name: '설정' }))
    expect(screen.getByTestId('settings-navigation-toolbar').compareDocumentPosition(screen.getAllByRole('button', { name: '저장' })[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
