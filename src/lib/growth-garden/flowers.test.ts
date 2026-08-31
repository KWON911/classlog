import { describe, expect, it } from 'vitest'
import { FLOWER_TYPES, flowerForStudent } from './flowers'

describe('flowerForStudent', () => {
  it('returns the same flower for the same student ID', () => {
    expect(flowerForStudent('student-17')).toBe(flowerForStudent('student-17'))
  })

  it('returns one of the supported flower types', () => {
    expect(FLOWER_TYPES).toHaveLength(6)
    expect(FLOWER_TYPES).toContain(flowerForStudent('student-42'))
  })
})
