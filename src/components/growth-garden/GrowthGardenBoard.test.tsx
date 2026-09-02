import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GrowthGardenBoard } from './GrowthGardenBoard'
import type { Student } from '../../lib/types'

const mockGardenView = vi.hoisted(() => vi.fn())
const mockClassGardenUnlock = vi.hoisted(() => ({
  id: 'unlock-pond',
  teacher_id: 'teacher-1',
  decoration_type: 'pond',
  year: 2026,
  month: 9,
  milestone_point: 100,
  unlocked_at: '2026-09-02T00:00:00.000Z',
  created_at: '2026-09-02T00:00:00.000Z',
}))

vi.mock('../../lib/hooks/useGrowthGarden', () => ({
  useGrowthGarden: () => ({
    entries: [],
    summaryFor: () => ({ studentId: 'student-1', score: 0, meritTotal: 0, demeritTotal: 0, stage: 0, progress: 0 }),
    loading: false,
    error: null,
    addPoint: vi.fn(),
    addBulkPoints: vi.fn(),
    deleteBatch: vi.fn(),
    isSaving: () => false,
    bulkSaving: false,
    clearClass: vi.fn(),
  }),
}))

vi.mock('../../lib/growth-garden/growthSettingsContext', () => ({
  useGrowthSettings: () => ({ environmentStages: [] }),
}))

vi.mock('../../lib/hooks/usePlantPulse', () => ({
  usePlantPulse: () => ({ pulseFor: () => null, trigger: vi.fn() }),
}))

vi.mock('../../lib/hooks/useClassGardenGoal', () => ({
  useClassGardenGoal: () => ({
    unlocks: [mockClassGardenUnlock],
    goalProgress: { newlyReachableMilestones: [{ point: 100, decorationType: 'pond' }] },
  }),
}))

vi.mock('./GardenStudentCard', () => ({ GardenStudentCard: () => <div /> }))
vi.mock('./GardenView', () => ({
  GardenView: (props: unknown) => {
    mockGardenView(props)
    return <div />
  },
}))

afterEach(cleanup)

const student: Student = {
  id: 'student-1',
  teacher_id: 'teacher-1',
  number: 1,
  name: '구태리',
  gender: null,
  birthdate: null,
  student_phone: null,
  address: null,
  father_name: null,
  father_phone: null,
  mother_name: null,
  mother_phone: null,
  emergency_contact: null,
  note: null,
  created_at: '2026-09-01T00:00:00.000Z',
}

describe('GrowthGardenBoard', () => {
  afterEach(() => mockGardenView.mockClear())

  it('separates primary navigation from display controls', () => {
    render(
      <MemoryRouter initialEntries={['/growth-garden']}>
        <GrowthGardenBoard students={[student]} studentsLoading={false} />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('garden-primary-toolbar')).toContainElement(screen.getByRole('link', { name: '정원' }))
    expect(screen.getByTestId('garden-primary-toolbar')).toContainElement(screen.getByRole('button', { name: '학생 선택' }))
    expect(screen.getByTestId('garden-display-toolbar')).toContainElement(screen.getByRole('group', { name: '정렬 기준' }))
    expect(screen.getByTestId('garden-display-toolbar')).toContainElement(screen.getByRole('group', { name: '보기 모드' }))
  })

  it('keeps sorting and view controls on their own full row after switching to garden view', () => {
    render(
      <MemoryRouter initialEntries={['/growth-garden']}>
        <GrowthGardenBoard students={[student]} studentsLoading={false} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '정원 보기' }))

    const controlsRow = screen.getByRole('group', { name: '정렬 기준' }).parentElement
    expect(controlsRow).toHaveClass('w-full')
    expect(controlsRow).not.toHaveClass('sm:w-auto')
  })

  it('passes permanent unlocks and newly reachable decoration types to the garden view', () => {
    render(
      <MemoryRouter initialEntries={['/growth-garden']}>
        <GrowthGardenBoard students={[student]} studentsLoading={false} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '정원 보기' }))

    expect(mockGardenView).toHaveBeenLastCalledWith(
      expect.objectContaining({
        unlocks: [mockClassGardenUnlock],
        newlyUnlockedTypes: new Set(['pond']),
      }),
    )
  })
})
