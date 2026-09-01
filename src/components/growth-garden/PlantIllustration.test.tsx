import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { flowerForStudent } from '../../lib/growth-garden/flowers'
import { PlantIllustration } from './PlantIllustration'

describe('PlantIllustration', () => {
  it('reveals each student\'s deterministic flower marker only at the final stage', () => {
    const firstStudentId = 'student-17'
    const secondStudentId = 'student-42'
    expect(flowerForStudent(firstStudentId)).not.toBe(flowerForStudent(secondStudentId))

    const { container, rerender } = render(<PlantIllustration stage={6} studentId={firstStudentId} />)

    expect(container.querySelector('[data-flower-type]')).toHaveAttribute(
      'data-flower-type',
      flowerForStudent(firstStudentId),
    )

    rerender(<PlantIllustration stage={6} studentId={secondStudentId} />)

    expect(container.querySelector('[data-flower-type]')).toHaveAttribute(
      'data-flower-type',
      flowerForStudent(secondStudentId),
    )
  })

  it('keeps the flower visible through post-bloom stages', () => {
    const { container } = render(<PlantIllustration stage={7} studentId="student-17" />)
    expect(container.querySelector('[data-flower-type]')).toHaveAttribute('data-flower-type', flowerForStudent('student-17'))
  })
})
