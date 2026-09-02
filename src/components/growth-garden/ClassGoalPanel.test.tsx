import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ClassGoal } from '../../lib/types'
import { buildClassGoalProgress } from '../../lib/growth-garden/classGoal'
import { ClassGoalPanel } from './ClassGoalPanel'

const goal: ClassGoal = {
  id: 'goal-1', teacher_id: 'teacher-1', year: 2026, month: 9, target_point: 300,
  milestones: [
    { point: 100, decorationType: 'stone_path' },
    { point: 200, decorationType: 'bench' },
    { point: 300, decorationType: 'pond' },
  ],
  created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-01T00:00:00.000Z',
}

afterEach(cleanup)

describe('ClassGoalPanel', () => {
  it('shows the next decoration, remaining points, and completed milestones without student contributions', () => {
    const progress = buildClassGoalProgress(goal, 243, [{
      id: 'unlock-1', teacher_id: 'teacher-1', decoration_type: 'stone_path', year: 2026, month: 9,
      milestone_point: 100, unlocked_at: '2026-09-02T00:00:00.000Z', created_at: '2026-09-02T00:00:00.000Z',
    }])

    render(<ClassGoalPanel goal={goal} progress={progress} onOpenSettings={vi.fn()} />)

    expect(screen.getByText('57점 남았어요')).toBeInTheDocument()
    expect(screen.getByText('✓ 돌길')).toBeInTheDocument()
    expect(screen.getByText(/다음 장식: 작은 연못/)).toBeInTheDocument()
    expect(screen.queryByText(/학생별/)).not.toBeInTheDocument()
  })

  it('guides teachers to create a goal when the month has no goal', () => {
    const onOpenSettings = vi.fn()
    render(<ClassGoalPanel goal={null} progress={null} onOpenSettings={onOpenSettings} />)

    screen.getByRole('button', { name: '공동 목표 만들기' }).click()
    expect(onOpenSettings).toHaveBeenCalledOnce()
  })

  it('keeps only month and score in fullscreen mode after completion', () => {
    render(<ClassGoalPanel goal={goal} progress={buildClassGoalProgress(goal, 300)} onOpenSettings={vi.fn()} compact />)

    expect(screen.getByText('9월 공동 목표')).toBeInTheDocument()
    expect(screen.getByText('300 / 300점')).toBeInTheDocument()
    expect(screen.queryByText('작은 연못')).not.toBeInTheDocument()
  })
})
