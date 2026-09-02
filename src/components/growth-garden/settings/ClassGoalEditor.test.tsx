import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ClassGoal } from '../../../lib/types'
import { ClassGoalEditor } from './ClassGoalEditor'

const initialGoal: ClassGoal = {
  id: 'goal-1', teacher_id: 'teacher-1', year: 2026, month: 9, target_point: 300,
  milestones: [
    { point: 100, decorationType: 'stone_path' },
    { point: 200, decorationType: 'bench' },
    { point: 300, decorationType: 'pond' },
  ],
  created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-01T00:00:00.000Z',
}

afterEach(cleanup)

describe('ClassGoalEditor', () => {
  it('prevents saving duplicate or non-ascending milestones', async () => {
    const onSave = vi.fn()
    render(<ClassGoalEditor initialGoal={initialGoal} unlockedTypes={new Set()} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('2단계 장식'), { target: { value: 'stone_path' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('중복')
  })

  it('starts a new month with three editable rows and disables globally unlocked decorations', () => {
    render(<ClassGoalEditor initialGoal={null} unlockedTypes={new Set(['pond'])} onSave={vi.fn()} />)

    expect(screen.getAllByLabelText(/단계 점수/)).toHaveLength(3)
    expect(screen.getAllByRole('option', { name: '작은 연못 (이미 해금됨)' })[0]).toBeDisabled()
    expect(screen.getByRole('button', { name: '단계 추가' })).toBeEnabled()
  })

  it('locks the point, decoration, and deletion controls for an already unlocked milestone', () => {
    render(
      <ClassGoalEditor
        initialGoal={initialGoal}
        unlockedTypes={new Set(['stone_path'])}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('1단계 점수')).toBeDisabled()
    expect(screen.getByLabelText('1단계 장식')).toBeDisabled()
    expect(screen.getByRole('button', { name: '1단계 삭제' })).toBeDisabled()
    expect(screen.getByText('해금 완료')).toBeInTheDocument()
  })

  it('does not create or save a new goal draft when fewer than three decorations remain unused', () => {
    const onSave = vi.fn()
    render(
      <ClassGoalEditor
        initialGoal={null}
        unlockedTypes={new Set(['stone_path', 'bench', 'pond', 'birdhouse', 'big_tree', 'bridge'])}
        onSave={onSave}
      />,
    )

    expect(screen.queryAllByLabelText(/단계 점수/)).toHaveLength(0)
    expect(screen.getByRole('alert')).toHaveTextContent('사용하지 않은 장식이 3개 이상')
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).not.toHaveBeenCalled()
  })
})
