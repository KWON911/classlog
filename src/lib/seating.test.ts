import { describe, expect, it } from 'vitest'
import {
  areAdjacent,
  canUseSeat,
  createSeats,
  derivePastNeighborPairs,
  generatePlacement,
  mapGender,
  placeStudents,
  scorePlacement,
  shuffle,
} from './seating'
import type { SeatingPlan } from './types'

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

describe('placeStudents', () => {
  it('throws when there are more students than available seats', () => {
    const seats = createSeats(1, 2)
    const students = [
      { id: 's1', gender: 'unspecified' as const },
      { id: 's2', gender: 'unspecified' as const },
      { id: 's3', gender: 'unspecified' as const },
    ]
    expect(() =>
      placeStudents(students, seats, { fixed: new Map(), separations: [], avoidPairs: new Set() }),
    ).toThrow('학생 3명에 비해 사용 가능한 좌석이 2개입니다.')
  })

  it('fills exactly-matching gender-restricted seats without a false unsatisfiable error', () => {
    const seats = createSeats(5, 5)
    for (let i = 0; i < 12; i++) {
      seats[i].genderSeat = 'male'
    }
    const students = [
      ...Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, gender: 'male' as const })),
      ...Array.from({ length: 13 }, (_, i) => ({ id: `f${i}`, gender: 'female' as const })),
    ]
    for (let i = 0; i < 20; i++) {
      const result = placeStudents(students, seats, { fixed: new Map(), separations: [], avoidPairs: new Set() })
      expect(result.size).toBe(25)
    }
  })

  it('keeps a fixed student on their assigned seat', () => {
    const seats = createSeats(1, 3)
    const students = [
      { id: 's1', gender: 'unspecified' as const },
      { id: 's2', gender: 'unspecified' as const },
      { id: 's3', gender: 'unspecified' as const },
    ]
    const fixed = new Map([['s1', 'r1-c2']])
    const result = placeStudents(students, seats, { fixed, separations: [], avoidPairs: new Set() })
    expect(result.get('s1')).toBe('r1-c2')
    expect(result.size).toBe(3)
  })

  it('throws when two students with an orthogonal separation cannot avoid being adjacent', () => {
    const seats = createSeats(1, 2)
    const students = [
      { id: 's1', gender: 'unspecified' as const },
      { id: 's2', gender: 'unspecified' as const },
    ]
    const separations = [{ student_a: 's1', student_b: 's2', type: 'orthogonal' as const }]
    expect(() =>
      placeStudents(students, seats, { fixed: new Map(), separations, avoidPairs: new Set() }),
    ).toThrow(
      '현재 고정·분리·성별 자리 조건을 동시에 만족하는 자리를 찾지 못했습니다. 조건이나 좌석 수를 확인해 주세요.',
    )
  })

  it('respects a diagonal separation rule across multiple runs', () => {
    const seats = createSeats(2, 3)
    const students = [
      { id: 's1', gender: 'unspecified' as const },
      { id: 's2', gender: 'unspecified' as const },
    ]
    const separations = [{ student_a: 's1', student_b: 's2', type: 'diagonal' as const }]
    const seatById = new Map(seats.map((s) => [s.id, s]))
    for (let i = 0; i < 20; i++) {
      const result = placeStudents(students, seats, { fixed: new Map(), separations, avoidPairs: new Set() })
      const seatA = seatById.get(result.get('s1')!)!
      const seatB = seatById.get(result.get('s2')!)!
      const dr = Math.abs(seatA.row - seatB.row)
      const dc = Math.abs(seatA.column - seatB.column)
      expect(Math.max(dr, dc)).toBeGreaterThan(1)
    }
  })

  it('only places a gender-restricted seat with a matching-gender student', () => {
    const seats = createSeats(1, 2)
    seats[0].genderSeat = 'male'
    const students = [
      { id: 's1', gender: 'female' as const },
      { id: 's2', gender: 'male' as const },
    ]
    const result = placeStudents(students, seats, { fixed: new Map(), separations: [], avoidPairs: new Set() })
    expect(result.get('s2')).toBe('r1-c1')
    expect(result.get('s1')).toBe('r1-c2')
  })

  it('throws when a fixed seat conflicts with a gender-restricted seat', () => {
    const seats = createSeats(1, 1)
    seats[0].genderSeat = 'female'
    const students = [{ id: 's1', gender: 'male' as const }]
    const fixed = new Map([['s1', 'r1-c1']])
    expect(() =>
      placeStudents(students, seats, { fixed, separations: [], avoidPairs: new Set() }),
    ).toThrow('고정 조건과 성별 지정 좌석이 맞지 않습니다.')
  })
})

describe('scorePlacement', () => {
  const seats = createSeats(1, 2)
  const students = [
    { id: 's1', gender: 'male' as const },
    { id: 's2', gender: 'male' as const },
  ]

  it('penalizes adjacent same-gender students when gender balance is on', () => {
    const candidate = new Map([
      ['s1', 'r1-c1'],
      ['s2', 'r1-c2'],
    ])
    const score = scorePlacement(candidate, students, seats, {
      genderBalance: true,
      previousAssignments: new Map(),
      avoidPairs: new Set(),
    })
    expect(score).toBe(1)
  })

  it('does not penalize when gender balance is off', () => {
    const candidate = new Map([
      ['s1', 'r1-c1'],
      ['s2', 'r1-c2'],
    ])
    const score = scorePlacement(candidate, students, seats, {
      genderBalance: false,
      previousAssignments: new Map(),
      avoidPairs: new Set(),
    })
    expect(score).toBe(0)
  })

  it('adds a penalty score when a student stays in their previous seat (discourages repeats since lower score wins)', () => {
    const candidate = new Map([['s1', 'r1-c1']])
    const score = scorePlacement(candidate, [students[0]], seats, {
      genderBalance: false,
      previousAssignments: new Map([['s1', 'r1-c1']]),
      avoidPairs: new Set(),
    })
    expect(score).toBe(8)
  })

  it('penalizes seating an avoid-pair next to each other', () => {
    const seats2 = createSeats(1, 2)
    const students2 = [
      { id: 's1', gender: 'unspecified' as const },
      { id: 's2', gender: 'unspecified' as const },
    ]
    const candidate = new Map([
      ['s1', 'r1-c1'],
      ['s2', 'r1-c2'],
    ])
    const score = scorePlacement(candidate, students2, seats2, {
      genderBalance: false,
      previousAssignments: new Map(),
      avoidPairs: new Set([['s1', 's2'].sort().join('::')]),
    })
    expect(score).toBe(4)
  })
})

describe('generatePlacement', () => {
  it('returns a full placement across the 60-candidate search', () => {
    const seats = createSeats(1, 3)
    const students = [
      { id: 's1', gender: 'unspecified' as const },
      { id: 's2', gender: 'unspecified' as const },
      { id: 's3', gender: 'unspecified' as const },
    ]
    const result = generatePlacement(
      students,
      seats,
      { fixed: new Map(), separations: [], avoidPairs: new Set() },
      { genderBalance: false, previousAssignments: new Map() },
    )
    expect(result.size).toBe(3)
  })
})

describe('derivePastNeighborPairs', () => {
  function plan(overrides: Partial<SeatingPlan>): SeatingPlan {
    return {
      id: 'p1',
      teacher_id: 't1',
      title: '1차',
      plan_date: '2026-08-01',
      rows: 2,
      columns: 3,
      teacher_direction: 'north',
      seats: createSeats(2, 3),
      assignments: [],
      separations: [],
      gender_balance: false,
      avoid_past_neighbors: false,
      created_at: '2026-08-01',
      ...overrides,
    }
  }

  it('pairs students seated left-right, but not front-back or diagonal', () => {
    const plans = [
      plan({
        assignments: [
          { student_id: 's1', seat_id: 'r1-c1', is_fixed: false, source: 'automatic' },
          { student_id: 's2', seat_id: 'r1-c2', is_fixed: false, source: 'automatic' },
          { student_id: 's3', seat_id: 'r2-c1', is_fixed: false, source: 'automatic' },
          { student_id: 's4', seat_id: 'r2-c2', is_fixed: false, source: 'automatic' },
        ],
      }),
    ]

    const pairs = derivePastNeighborPairs(plans)

    expect(pairs.has(['s1', 's2'].sort().join('::'))).toBe(true)
    expect(pairs.has(['s3', 's4'].sort().join('::'))).toBe(true)
    expect(pairs.has(['s1', 's3'].sort().join('::'))).toBe(false)
    expect(pairs.has(['s1', 's4'].sort().join('::'))).toBe(false)
    expect(pairs.has(['s2', 's3'].sort().join('::'))).toBe(false)
  })

  it('merges pairs across multiple plans', () => {
    const plans = [
      plan({
        assignments: [
          { student_id: 's1', seat_id: 'r1-c1', is_fixed: false, source: 'automatic' },
          { student_id: 's2', seat_id: 'r1-c2', is_fixed: false, source: 'automatic' },
        ],
      }),
      plan({
        id: 'p2',
        assignments: [
          { student_id: 's3', seat_id: 'r1-c1', is_fixed: false, source: 'automatic' },
          { student_id: 's4', seat_id: 'r1-c2', is_fixed: false, source: 'automatic' },
        ],
      }),
    ]

    const pairs = derivePastNeighborPairs(plans)
    expect(pairs.size).toBe(2)
  })
})
