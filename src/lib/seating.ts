import type { Seat, SeatSeparation, SeparationType } from './types'

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
    for (const [otherId, otherSeatId] of placed) {
      const otherSeat = seatById.get(otherSeatId)!
      if (seat.row === otherSeat.row && Math.abs(seat.column - otherSeat.column) === 1) {
        if (constraints.avoidPairs.has(pairKey(studentId, otherId))) return false
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
    const candidateSeats = shuffle(
      usable.filter((seat) => !isSeatTaken(placed, seat.id) && canUseSeat(student.gender, seat)),
    )
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
