import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { ClassGardenUnlock } from '../../lib/types'
import { GardenDecorationLayer } from './GardenDecorationLayer'

afterEach(cleanup)

const unlock = (decoration_type: ClassGardenUnlock['decoration_type']): ClassGardenUnlock => ({
  id: `unlock-${decoration_type}`,
  teacher_id: 'teacher-1',
  decoration_type,
  year: 2026,
  month: 9,
  milestone_point: 100,
  unlocked_at: '2026-09-02T00:00:00.000Z',
  created_at: '2026-09-02T00:00:00.000Z',
})

describe('GardenDecorationLayer', () => {
  it('draws only unlocked decorations in deterministic safe slots below the student grid', () => {
    render(
      <GardenDecorationLayer
        unlocks={[unlock('pond'), unlock('bench'), unlock('big_tree')]}
        isFullscreen={false}
        newlyUnlockedTypes={new Set()}
      />,
    )

    expect(screen.getByLabelText('작은 연못')).toBeInTheDocument()
    expect(screen.getByLabelText('정원 벤치')).toBeInTheDocument()
    expect(screen.getByLabelText('큰 나무')).toBeInTheDocument()
    expect(screen.queryByLabelText('정원등')).not.toBeInTheDocument()

    const layer = screen.getByTestId('garden-decoration-layer')
    expect(layer).toHaveClass('z-[1]')
    expect(screen.getByTestId('garden-decoration-pond')).toHaveStyle({ left: '8%', top: '58%' })
  })

  it('uses the fullscreen scale while preserving the same safe slot', () => {
    const { rerender } = render(
      <GardenDecorationLayer unlocks={[unlock('bridge')]} isFullscreen={false} newlyUnlockedTypes={new Set()} />,
    )
    const standard = screen.getByTestId('garden-decoration-bridge')
    const standardWidth = standard.style.width

    rerender(<GardenDecorationLayer unlocks={[unlock('bridge')]} isFullscreen newlyUnlockedTypes={new Set()} />)

    const fullscreen = screen.getByTestId('garden-decoration-bridge')
    expect(fullscreen).toHaveStyle({ left: '67%', top: '61%' })
    expect(fullscreen.style.width).not.toBe(standardWidth)
  })
})
