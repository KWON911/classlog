import { describe, expect, it } from 'vitest'
import { areAdjacent, canUseSeat, createSeats, mapGender, shuffle } from './seating'

describe('createSeats', () => {
  it('creates a row-major grid with ids encoding row and column', () => {
    const seats = createSeats(2, 3)
    expect(seats).toHaveLength(6)
    expect(seats[0]).toEqual({ id: 'r1-c1', row: 1, column: 1, status: 'available' })
    expect(seats[3]).toEqual({ id: 'r2-c1', row: 2, column: 1, status: 'available' })
    expect(seats[5]).toEqual({ id: 'r2-c3', row: 2, column: 3, status: 'available' })
  })
})

describe('shuffle', () => {
  it('returns an array with the same elements, not the same reference', () => {
    const original = [1, 2, 3, 4, 5]
    const result = shuffle(original)
    expect(result).not.toBe(original)
    expect([...result].sort()).toEqual([...original].sort())
  })
})

describe('mapGender', () => {
  it('maps 남 to male, 여 to female, anything else to unspecified', () => {
    expect(mapGender('남')).toBe('male')
    expect(mapGender('여')).toBe('female')
    expect(mapGender(null)).toBe('unspecified')
    expect(mapGender('기타')).toBe('unspecified')
  })
})

describe('areAdjacent', () => {
  const seatA = { id: 'r1-c1', row: 1, column: 1, status: 'available' as const }
  const seatB = { id: 'r1-c2', row: 1, column: 2, status: 'available' as const }
  const seatDiag = { id: 'r2-c2', row: 2, column: 2, status: 'available' as const }
  const seatFar = { id: 'r3-c3', row: 3, column: 3, status: 'available' as const }

  it('treats orthogonal neighbors as adjacent for both types', () => {
    expect(areAdjacent(seatA, seatB, 'orthogonal')).toBe(true)
    expect(areAdjacent(seatA, seatB, 'diagonal')).toBe(true)
  })

  it('treats diagonal neighbors as adjacent only for the diagonal type', () => {
    expect(areAdjacent(seatA, seatDiag, 'orthogonal')).toBe(false)
    expect(areAdjacent(seatA, seatDiag, 'diagonal')).toBe(true)
  })

  it('treats far-apart seats as not adjacent for either type', () => {
    expect(areAdjacent(seatA, seatFar, 'orthogonal')).toBe(false)
    expect(areAdjacent(seatA, seatFar, 'diagonal')).toBe(false)
  })
})

describe('canUseSeat', () => {
  const openSeat = { id: 'r1-c1', row: 1, column: 1, status: 'available' as const }
  const maleSeat = {
    id: 'r1-c2',
    row: 1,
    column: 2,
    status: 'available' as const,
    genderSeat: 'male' as const,
  }

  it('allows any gender on a seat with no gender restriction', () => {
    expect(canUseSeat('male', openSeat)).toBe(true)
    expect(canUseSeat('female', openSeat)).toBe(true)
    expect(canUseSeat('unspecified', openSeat)).toBe(true)
  })

  it('only allows the matching gender on a gender-restricted seat', () => {
    expect(canUseSeat('male', maleSeat)).toBe(true)
    expect(canUseSeat('female', maleSeat)).toBe(false)
    expect(canUseSeat('unspecified', maleSeat)).toBe(false)
  })
})
