import type { Seat, SeparationType } from './types'

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
