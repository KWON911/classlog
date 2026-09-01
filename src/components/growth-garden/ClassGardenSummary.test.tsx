import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ClassGardenSummary } from './ClassGardenSummary'
import type { GardenEnvironment } from '../../lib/growth-garden/environment'
import { GARDEN_ENVIRONMENT_STAGES } from '../../lib/growth-garden/constants'

const current = GARDEN_ENVIRONMENT_STAGES[1]
const environment: GardenEnvironment = {
  averageScore: 3,
  totalScore: 75,
  stage: current.stage,
  current,
  next: null,
  remainingPoints: 0,
  ratio: 1,
}

describe('ClassGardenSummary', () => {
  it('keeps the supplied scene action in a dedicated right-aligned region', () => {
    render(<ClassGardenSummary environment={environment} action={<button>전체화면 보기</button>} />)

    expect(screen.getByTestId('garden-scene-action')).toContainElement(screen.getByRole('button', { name: '전체화면 보기' }))
    expect(screen.getByTestId('garden-scene-action')).toHaveClass('ml-auto', 'shrink-0')
  })
})
