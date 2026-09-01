import type { PreviousSeatHistoryScope, Seat, SeatingPlan, SeatSeparation, SeparationType } from './types'

export type StudentGenderBucket = 'male' | 'female' | 'unspecified'

export function mapGender(gender: string | null): StudentGenderBucket {
  if (gender === '남') return 'male'
  if (gender === '여') return 'female'
  return 'unspecified'
}

export function createSeats(rows: number, columns: number): Seat[] {
  const seats: Seat[] = []
  for (let row = 1; row <= rows; row++) {
    for (let column = 1; column <= columns; column++) {
      seats.push({ id: `r${row}-c${column}`, row, column, status: 'available' })
    }
  }
  return seats
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function areAdjacent(a: Seat, b: Seat, type: SeparationType): boolean {
  const rowDiff = Math.abs(a.row - b.row)
  const columnDiff = Math.abs(a.column - b.column)
  return type === 'diagonal' ? Math.max(rowDiff, columnDiff) <= 1 : rowDiff + columnDiff === 1
}

export function canUseSeat(gender: StudentGenderBucket, seat: Seat): boolean {
  return !seat.genderSeat || gender === seat.genderSeat
}

export type PlacementConstraints = {
  fixed: Map<string, string>
  separations: SeatSeparation[]
  avoidPairs: Set<string>
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('::')
}

export function placeStudents(
  students: { id: string; gender: StudentGenderBucket }[],
  seats: Seat[],
  constraints: PlacementConstraints,
): Map<string, string> {
  const usable = seats.filter((seat) => seat.status === 'available')
  if (students.length > usable.length) {
    throw new Error(`학생 ${students.length}명에 비해 사용 가능한 좌석이 ${usable.length}개입니다.`)
  }

  const seatById = new Map(usable.map((seat) => [seat.id, seat]))
  const genderById = new Map(students.map((student) => [student.id, student.gender]))

  function isSeatTaken(placed: Map<string, string>, seatId: string): boolean {
    for (const takenSeatId of placed.values()) {
      if (takenSeatId === seatId) return true
    }
    return false
  }

  function validPlacement(studentId: string, seatId: string, placed: Map<string, string>): boolean {
    const seat = seatById.get(seatId)!
    for (const rule of constraints.separations) {
      const otherId =
        rule.student_a === studentId ? rule.student_b : rule.student_b === studentId ? rule.student_a : null
      if (otherId && placed.has(otherId)) {
        const otherSeat = seatById.get(placed.get(otherId)!)!
        if (areAdjacent(seat, otherSeat, rule.type)) return false
      }
    }
    return true
  }

  const placed = new Map<string, string>()

  for (const [studentId, seatId] of constraints.fixed) {
    const gender = genderById.get(studentId)
    const seat = seatById.get(seatId)
    if (!gender || !seat || isSeatTaken(placed, seatId) || !canUseSeat(gender, seat)) {
      throw new Error('고정 조건과 성별 지정 좌석이 맞지 않습니다.')
    }
    if (!validPlacement(studentId, seatId, placed)) {
      throw new Error('고정된 학생 사이의 분리 조건을 만족할 수 없습니다.')
    }
    placed.set(studentId, seatId)
  }

  const remaining = shuffle(students.filter((student) => !placed.has(student.id))).sort((a, b) => {
    const countFor = (id: string) =>
      constraints.separations.filter((rule) => rule.student_a === id || rule.student_b === id).length
    return countFor(b.id) - countFor(a.id)
  })

  let nodes = 0
  function place(index: number): boolean {
    if (index === remaining.length) return true
    if (++nodes > 30000) return false
    const student = remaining[index]
    // Try gender-restricted seats before unrestricted ones: a gender-restricted
    // seat can only ever be filled by a matching-gender student, while an
    // unrestricted seat can be filled by anyone. Trying restricted seats first
    // keeps unrestricted seats available for later students, which avoids
    // backtracking blowups when the restricted-seat count exactly matches the
    // matching-gender student count.
    const candidateSeats = shuffle(
      usable.filter((seat) => !isSeatTaken(placed, seat.id) && canUseSeat(student.gender, seat)),
    ).sort((a, b) => (a.genderSeat ? 0 : 1) - (b.genderSeat ? 0 : 1))
    for (const seat of candidateSeats) {
      if (validPlacement(student.id, seat.id, placed)) {
        placed.set(student.id, seat.id)
        if (place(index + 1)) return true
        placed.delete(student.id)
      }
    }
    return false
  }

  if (!place(0)) {
    throw new Error(
      '현재 고정·분리·성별 자리 조건을 동시에 만족하는 자리를 찾지 못했습니다. 조건이나 좌석 수를 확인해 주세요.',
    )
  }

  return placed
}

export function scorePlacement(
  candidate: Map<string, string>,
  students: { id: string; gender: StudentGenderBucket }[],
  seats: Seat[],
  options: {
    genderBalance: boolean
    previousAssignments: Map<string, string>
    avoidPairs: Set<string>
    pastSeatsByStudent?: Map<string, Map<string, number>>
  },
): number {
  let total = 0
  const seatById = new Map(seats.map((seat) => [seat.id, seat]))
  const genderById = new Map(students.map((student) => [student.id, student.gender]))
  const entries = [...candidate.entries()]

  if (options.genderBalance) {
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [studentA, seatIdA] = entries[i]
        const [studentB, seatIdB] = entries[j]
        const genderA = genderById.get(studentA)
        const genderB = genderById.get(studentB)
        if (
          genderA &&
          genderB &&
          genderA !== 'unspecified' &&
          genderA === genderB &&
          areAdjacent(seatById.get(seatIdA)!, seatById.get(seatIdB)!, 'orthogonal')
        ) {
          total += 1
        }
      }
    }
  }

  const entriesForAvoidPairs = [...candidate.entries()]
  for (let i = 0; i < entriesForAvoidPairs.length; i++) {
    for (let j = i + 1; j < entriesForAvoidPairs.length; j++) {
      const [studentA, seatIdA] = entriesForAvoidPairs[i]
      const [studentB, seatIdB] = entriesForAvoidPairs[j]
      const seatA = seatById.get(seatIdA)!
      const seatB = seatById.get(seatIdB)!
      if (seatA.row === seatB.row && Math.abs(seatA.column - seatB.column) === 1) {
        if (options.avoidPairs.has(pairKey(studentA, studentB))) {
          total += 4
        }
      }
    }
  }

  // generatePlacement minimizes this score, so this loop discourages
  // placing a student back in the exact seat they held in
  // `previousAssignments` — it pushes a reshuffle toward a visibly
  // different arrangement rather than "rewarding" staying put.
  for (const [studentId, seatId] of candidate) {
    if (options.previousAssignments.get(studentId) === seatId) {
      total += 8
    }
  }

  if (options.pastSeatsByStudent) {
    for (const [studentId, seatId] of candidate) {
      const pastSeats = options.pastSeatsByStudent.get(studentId)
      const weight = pastSeats?.get(seatId)
      if (weight) total += weight

      // A student who has recently occupied a rear row should be moved
      // forward when possible. Keep this as a strong soft penalty so a full
      // or heavily constrained classroom can still produce a placement.
      const candidateSeat = seatById.get(seatId)
      if (candidateSeat && candidateSeat.row >= 4 && pastSeats) {
        let rearRowHistoryWeight = 0
        for (const [pastSeatId, pastWeight] of pastSeats) {
          const pastSeat = seatById.get(pastSeatId)
          if (pastSeat && pastSeat.row >= 4) rearRowHistoryWeight += pastWeight
        }
        total += rearRowHistoryWeight * 4
      }
    }
  }

  return total
}

export function generatePlacement(
  students: { id: string; gender: StudentGenderBucket }[],
  seats: Seat[],
  constraints: PlacementConstraints,
  options: {
    genderBalance: boolean
    previousAssignments: Map<string, string>
    pastSeatsByStudent?: Map<string, Map<string, number>>
  },
): Map<string, string> {
  let best: Map<string, string> | null = null
  let bestScore = Infinity
  let lastError: unknown = null
  for (let i = 0; i < 60; i++) {
    // placeStudents can throw when a single attempt's backtracking search
    // exceeds its node budget on an unlucky random ordering — that doesn't
    // mean the constraints are unsatisfiable, just that this one attempt
    // didn't find a solution in time. Skip it and keep trying rather than
    // letting one bad attempt discard every valid placement already found.
    let candidate: Map<string, string>
    try {
      candidate = placeStudents(students, seats, constraints)
    } catch (error) {
      lastError = error
      continue
    }
    const candidateScore = scorePlacement(candidate, students, seats, {
      ...options,
      avoidPairs: constraints.avoidPairs,
    })
    if (candidateScore < bestScore || (candidateScore === bestScore && Math.random() < 0.5)) {
      best = candidate
      bestScore = candidateScore
    }
  }
  if (!best) {
    if (lastError instanceof Error) throw lastError
    throw new Error(
      '현재 고정·분리·성별 자리 조건을 동시에 만족하는 자리를 찾지 못했습니다. 조건이나 좌석 수를 확인해 주세요.',
    )
  }
  return best
}

export function derivePastNeighborPairs(plans: SeatingPlan[]): Set<string> {
  const pairs = new Set<string>()
  for (const plan of plans) {
    const studentBySeatId = new Map(
      plan.assignments.map((assignment) => [assignment.seat_id, assignment.student_id]),
    )
    for (const seat of plan.seats) {
      const studentId = studentBySeatId.get(seat.id)
      if (!studentId) continue
      const neighborSeat = plan.seats.find(
        (other) => other.row === seat.row && other.column === seat.column + 1,
      )
      if (!neighborSeat) continue
      const neighborStudentId = studentBySeatId.get(neighborSeat.id)
      if (!neighborStudentId) continue
      pairs.add(pairKey(studentId, neighborStudentId))
    }
  }
  return pairs
}

// Korean school calendar: 1st semester Mar 1 - Aug 31, 2nd semester Sep 1 -
// end of Feb the following year. January/February belong to the *previous*
// calendar year's 2nd semester, not a new one.
function semesterRange(referenceDate: string): { start: string; end: string } {
  const [yearStr, monthStr] = referenceDate.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  if (month >= 3 && month <= 8) {
    return { start: `${year}-03-01`, end: `${year}-09-01` }
  }
  const startYear = month >= 9 ? year : year - 1
  return { start: `${startYear}-09-01`, end: `${startYear + 1}-03-01` }
}

/**
 * Selects which saved plans count as "history" for a given scope. Recency
 * (`latest1`/`latest3`) is ordered by `created_at` — the actual save
 * time — not by `plan_date` (a user-editable field) or the caller's array
 * order, since either of those can disagree with when a plan was really
 * saved.
 */
export function filterPlansByScope(
  plans: SeatingPlan[],
  scope: PreviousSeatHistoryScope,
  referenceDate: string,
): SeatingPlan[] {
  const sortedByRecency = [...plans].sort((a, b) => b.created_at.localeCompare(a.created_at))
  if (scope === 'latest1') return sortedByRecency.slice(0, 1)
  if (scope === 'latest3') return sortedByRecency.slice(0, 3)
  if (scope === 'currentSemester') {
    const { start, end } = semesterRange(referenceDate)
    return sortedByRecency.filter((plan) => plan.plan_date >= start && plan.plan_date < end)
  }
  return sortedByRecency
}

/**
 * For each student, maps their past seat ids (from the given plans, already
 * scope-filtered by the caller) to a recency-weighted penalty: the most
 * recent plan contributes weight 6, decreasing by 1 per older plan down to
 * a floor of 1, and repeats of the same seat across multiple plans sum. A
 * past seat id that doesn't exist in the current layout (`currentSeatIds`)
 * is skipped and counted in `excludedRecordCount`, so callers can tell the
 * user some history didn't apply to the current seat structure.
 */
export function derivePastSeatsByStudent(
  plans: SeatingPlan[],
  currentSeatIds: Set<string>,
): { pastSeatsByStudent: Map<string, Map<string, number>>; excludedRecordCount: number } {
  const pastSeatsByStudent = new Map<string, Map<string, number>>()
  let excludedRecordCount = 0

  plans.forEach((plan, planIndex) => {
    const weight = Math.max(1, 6 - planIndex)
    for (const assignment of plan.assignments) {
      if (!currentSeatIds.has(assignment.seat_id)) {
        excludedRecordCount += 1
        continue
      }
      const studentSeats = pastSeatsByStudent.get(assignment.student_id) ?? new Map<string, number>()
      studentSeats.set(assignment.seat_id, (studentSeats.get(assignment.seat_id) ?? 0) + weight)
      pastSeatsByStudent.set(assignment.student_id, studentSeats)
    }
  })

  return { pastSeatsByStudent, excludedRecordCount }
}
