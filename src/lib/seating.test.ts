import { describe, expect, it } from 'vitest'
import {
  areAdjacent,
  canUseSeat,
  createSeats,
  derivePastNeighborPairs,
  derivePastSeatsByStudent,
  filterPlansByScope,
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

  it('adds the recorded weight when a student lands on a past seat', () => {
    const candidate = new Map([['s1', 'r1-c1']])
    const score = scorePlacement(candidate, [students[0]], seats, {
      genderBalance: false,
      previousAssignments: new Map(),
      avoidPairs: new Set(),
      pastSeatsByStudent: new Map([['s1', new Map([['r1-c1', 6]])]]),
    })
    expect(score).toBe(6)
  })

  it('strongly penalizes a student returning to the rear rows after a past rear-row seat', () => {
    const rearSeats = createSeats(5, 2)
    const candidate = new Map([['s1', 'r4-c1']])
    const score = scorePlacement(candidate, [students[0]], rearSeats, {
      genderBalance: false,
      previousAssignments: new Map(),
      avoidPairs: new Set(),
      pastSeatsByStudent: new Map([['s1', new Map([['r4-c2', 6]])]]),
    })

    expect(score).toBe(24)
  })

  it('scores normally when pastSeatsByStudent is omitted (backward compatible)', () => {
    const candidate = new Map([['s1', 'r1-c1']])
    const score = scorePlacement(candidate, [students[0]], seats, {
      genderBalance: false,
      previousAssignments: new Map(),
      avoidPairs: new Set(),
    })
    expect(score).toBe(0)
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

  it(
    'still returns a full placement when individual placeStudents attempts intermittently exceed their backtracking budget',
    () => {
      // A dense-but-solvable separation graph: each of 16 students is
      // separated from 4 specific others (a circulant graph), filling every
      // seat of a 4x4 grid with zero slack. Confirmed by manual reproduction
      // during code review that individual placeStudents() calls throw on a
      // meaningful fraction of random orderings here (the 30000-node search
      // budget), which used to make generatePlacement's un-guarded 60-try
      // loop abort entirely the moment any single attempt hit that budget —
      // even though most attempts, and therefore generatePlacement as a
      // whole, are perfectly capable of succeeding.
      const rows = 4
      const columns = 4
      const seats = createSeats(rows, columns)
      const ids = Array.from({ length: rows * columns }, (_, i) => `S${i}`)
      const students = ids.map((id) => ({ id, gender: 'unspecified' as const }))
      const offsets = [1, 2, 3, 5]
      const seen = new Set<string>()
      const separations = []
      for (let i = 0; i < ids.length; i++) {
        for (const offset of offsets) {
          const j = (i + offset) % ids.length
          const key = [i, j].sort((a, b) => a - b).join('-')
          if (seen.has(key)) continue
          seen.add(key)
          separations.push({ student_a: ids[i], student_b: ids[j], type: 'orthogonal' as const })
        }
      }

      const result = generatePlacement(
        students,
        seats,
        { fixed: new Map(), separations, avoidPairs: new Set() },
        { genderBalance: false, previousAssignments: new Map() },
      )
      expect(result.size).toBe(ids.length)
    },
    10000,
  )
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
      avoid_previous_seats: false,
      previous_seat_history_scope: 'latest3',
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

describe('filterPlansByScope', () => {
  function plan(overrides: Partial<SeatingPlan>): SeatingPlan {
    return {
      id: 'p1',
      teacher_id: 't1',
      title: '1차',
      plan_date: '2026-08-01',
      rows: 1,
      columns: 2,
      teacher_direction: 'north',
      seats: createSeats(1, 2),
      assignments: [],
      separations: [],
      gender_balance: false,
      avoid_past_neighbors: false,
      avoid_previous_seats: false,
      previous_seat_history_scope: 'latest3',
      created_at: '2026-08-01',
      ...overrides,
    }
  }

  it('sorts by created_at (actual save time), not by array order or plan_date', () => {
    // plan_date order deliberately disagrees with created_at order, so a
    // naive plan_date-based or array-order-based sort would fail this.
    const plans = [
      plan({ id: 'old-but-listed-first', plan_date: '2026-01-01', created_at: '2026-01-01T00:00:00Z' }),
      plan({ id: 'newest', plan_date: '2025-12-01', created_at: '2026-08-01T00:00:00Z' }),
      plan({ id: 'middle', plan_date: '2026-05-01', created_at: '2026-05-01T00:00:00Z' }),
    ]
    const result = filterPlansByScope(plans, 'latest1', '2026-08-02')
    expect(result.map((p) => p.id)).toEqual(['newest'])
  })

  it('latest3 returns at most the 3 most recent plans', () => {
    const plans = [
      plan({ id: 'p1', created_at: '2026-01-01T00:00:00Z' }),
      plan({ id: 'p2', created_at: '2026-02-01T00:00:00Z' }),
      plan({ id: 'p3', created_at: '2026-03-01T00:00:00Z' }),
      plan({ id: 'p4', created_at: '2026-04-01T00:00:00Z' }),
    ]
    const result = filterPlansByScope(plans, 'latest3', '2026-08-02')
    expect(result.map((p) => p.id)).toEqual(['p4', 'p3', 'p2'])
  })

  it('currentSemester keeps plans within the first-semester range (Mar 1 - Aug 31)', () => {
    const plans = [
      plan({ id: 'in-semester', plan_date: '2026-05-15' }),
      plan({ id: 'before-semester', plan_date: '2026-02-20' }),
      plan({ id: 'after-semester', plan_date: '2026-09-05' }),
    ]
    const result = filterPlansByScope(plans, 'currentSemester', '2026-08-02')
    expect(result.map((p) => p.id)).toEqual(['in-semester'])
  })

  it('currentSemester treats Jan/Feb as belonging to the previous year\'s second semester', () => {
    const plans = [
      plan({ id: 'prev-fall', plan_date: '2025-11-01' }),
      plan({ id: 'this-jan', plan_date: '2026-01-15' }),
      plan({ id: 'not-in-range', plan_date: '2025-08-01' }),
    ]
    // referenceDate is in February, so "current semester" is the 2nd
    // semester that started the previous September.
    const result = filterPlansByScope(plans, 'currentSemester', '2026-02-10')
    const ids = result.map((p) => p.id).sort()
    expect(ids).toEqual(['prev-fall', 'this-jan'])
  })

  it('all returns every plan, newest first', () => {
    const plans = [
      plan({ id: 'p1', created_at: '2026-01-01T00:00:00Z' }),
      plan({ id: 'p2', created_at: '2026-03-01T00:00:00Z' }),
    ]
    const result = filterPlansByScope(plans, 'all', '2026-08-02')
    expect(result.map((p) => p.id)).toEqual(['p2', 'p1'])
  })
})

describe('derivePastSeatsByStudent', () => {
  function plan(overrides: Partial<SeatingPlan>): SeatingPlan {
    return {
      id: 'p1',
      teacher_id: 't1',
      title: '1차',
      plan_date: '2026-08-01',
      rows: 1,
      columns: 2,
      teacher_direction: 'north',
      seats: createSeats(1, 2),
      assignments: [],
      separations: [],
      gender_balance: false,
      avoid_past_neighbors: false,
      avoid_previous_seats: false,
      previous_seat_history_scope: 'latest3',
      created_at: '2026-08-01',
      ...overrides,
    }
  }

  it('records the most recent plan\'s seat with the highest weight', () => {
    const plans = [
      plan({ assignments: [{ student_id: 's1', seat_id: 'r1-c1', is_fixed: false, source: 'automatic' }] }),
      plan({
        id: 'p2',
        assignments: [{ student_id: 's1', seat_id: 'r1-c2', is_fixed: false, source: 'automatic' }],
      }),
    ]
    const currentSeatIds = new Set(['r1-c1', 'r1-c2'])
    const { pastSeatsByStudent, excludedRecordCount } = derivePastSeatsByStudent(plans, currentSeatIds)

    expect(pastSeatsByStudent.get('s1')?.get('r1-c1')).toBe(6)
    expect(pastSeatsByStudent.get('s1')?.get('r1-c2')).toBe(5)
    expect(excludedRecordCount).toBe(0)
  })

  it('sums weight when the same student repeats the same seat across multiple plans', () => {
    const plans = [
      plan({ assignments: [{ student_id: 's1', seat_id: 'r1-c1', is_fixed: false, source: 'automatic' }] }),
      plan({
        id: 'p2',
        assignments: [{ student_id: 's1', seat_id: 'r1-c1', is_fixed: false, source: 'automatic' }],
      }),
    ]
    const currentSeatIds = new Set(['r1-c1', 'r1-c2'])
    const { pastSeatsByStudent } = derivePastSeatsByStudent(plans, currentSeatIds)

    expect(pastSeatsByStudent.get('s1')?.get('r1-c1')).toBe(11)
  })

  it('excludes seats that do not exist in the current layout and counts them', () => {
    const plans = [
      plan({
        assignments: [
          { student_id: 's1', seat_id: 'r1-c1', is_fixed: false, source: 'automatic' },
          { student_id: 's2', seat_id: 'r5-c9', is_fixed: false, source: 'automatic' },
        ],
      }),
    ]
    const currentSeatIds = new Set(['r1-c1', 'r1-c2'])
    const { pastSeatsByStudent, excludedRecordCount } = derivePastSeatsByStudent(plans, currentSeatIds)

    expect(pastSeatsByStudent.get('s1')?.get('r1-c1')).toBe(6)
    expect(pastSeatsByStudent.has('s2')).toBe(false)
    expect(excludedRecordCount).toBe(1)
  })

  it('the weight floor never drops below 1 no matter how old the record', () => {
    const plans = Array.from({ length: 10 }, (_, i) =>
      plan({
        id: `p${i}`,
        assignments: [{ student_id: 's1', seat_id: 'r1-c1', is_fixed: false, source: 'automatic' }],
      }),
    )
    const currentSeatIds = new Set(['r1-c1'])
    const { pastSeatsByStudent } = derivePastSeatsByStudent(plans, currentSeatIds)

    // weights: 6,5,4,3,2,1,1,1,1,1 = 25
    expect(pastSeatsByStudent.get('s1')?.get('r1-c1')).toBe(25)
  })
})
