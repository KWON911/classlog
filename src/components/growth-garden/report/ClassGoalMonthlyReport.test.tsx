import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { buildClassGoalProgress } from '../../../lib/growth-garden/classGoal'
import type { ClassGardenUnlock, ClassGoal } from '../../../lib/types'
import { ClassGoalMonthlyReport } from './ClassGoalMonthlyReport'

const septemberGoal: ClassGoal = {
  id: 'goal-september',
  teacher_id: 'teacher-1',
  year: 2026,
  month: 9,
  target_point: 300,
  milestones: [
    { point: 100, decorationType: 'pond' },
    { point: 200, decorationType: 'big_tree' },
    { point: 300, decorationType: 'garden_lamp' },
  ],
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
}

const pondUnlock: ClassGardenUnlock = {
  id: 'unlock-pond',
  teacher_id: 'teacher-1',
  decoration_type: 'pond',
  year: 2026,
  month: 9,
  milestone_point: 100,
  unlocked_at: '2026-09-10T00:00:00.000Z',
  created_at: '2026-09-10T00:00:00.000Z',
}

afterEach(cleanup)

describe('ClassGoalMonthlyReport', () => {
  it('shows only the selected month goal, merit score, that-month unlocks, and unmet milestones', () => {
    render(
      <ClassGoalMonthlyReport
        goal={septemberGoal}
        progress={buildClassGoalProgress(septemberGoal, 150, [pondUnlock])}
        monthlyUnlocks={[pondUnlock]}
      />,
    )

    expect(screen.getByText('9월 우리 반 공동 목표')).toBeInTheDocument()
    expect(screen.getByText('최종 상점 점수 150점')).toBeInTheDocument()
    expect(screen.getByText('✓ 작은 연못')).toBeInTheDocument()
    expect(screen.getByText('○ 큰 나무')).toBeInTheDocument()
    expect(screen.queryByText('가람')).not.toBeInTheDocument()
    expect(screen.queryByText(/순위/)).not.toBeInTheDocument()
    expect(screen.queryByText(/벌점/)).not.toBeInTheDocument()
  })

  it('does not confuse a different month unlock with a selected month result', () => {
    const octoberUnlock = { ...pondUnlock, id: 'unlock-october', year: 2026, month: 10 }

    render(
      <ClassGoalMonthlyReport
        goal={septemberGoal}
        progress={buildClassGoalProgress(septemberGoal, 150, [pondUnlock, octoberUnlock])}
        monthlyUnlocks={[]}
      />,
    )

    expect(screen.getByText('해금한 장식이 없어요.')).toBeInTheDocument()
  })
})
