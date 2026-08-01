import type { Seat, Student, TeacherDirection } from '../lib/types'

type SeatingGridProps = {
  seats: Seat[]
  columns: number
  teacherDirection: TeacherDirection
  viewMode: 'teacher' | 'back'
  assignments: Map<string, string>
  students: Student[]
  fixedSeatIds: Set<string>
  selectedSeatId: string | null
  onSeatClick: (seatId: string) => void
}

function displayPosition(seat: Seat, rows: number, columns: number, viewMode: 'teacher' | 'back') {
  if (viewMode !== 'back') return { row: seat.row, column: seat.column }
  return { row: rows + 1 - seat.row, column: columns + 1 - seat.column }
}

function seatClassName(seat: Seat, isFixed: boolean, isSelected: boolean) {
  const classes = ['min-h-[70px]', 'rounded', 'border', 'p-2', 'text-center', 'text-xs']
  if (seat.status === 'disabled') classes.push('border-dashed', 'bg-gray-200', 'text-gray-500')
  else if (seat.status === 'empty') classes.push('border-yellow-400', 'bg-yellow-50')
  else if (isFixed) classes.push('border-green-500', 'bg-green-50')
  else if (seat.genderSeat === 'male') classes.push('border-blue-400', 'bg-blue-50')
  else if (seat.genderSeat === 'female') classes.push('border-pink-400', 'bg-pink-50')
  else classes.push('border-gray-300', 'bg-white')
  if (isSelected) classes.push('ring-2', 'ring-yellow-500')
  return classes.join(' ')
}

export function SeatingGrid({
  seats,
  columns,
  teacherDirection,
  viewMode,
  assignments,
  students,
  fixedSeatIds,
  selectedSeatId,
  onSeatClick,
}: SeatingGridProps) {
  const rows = seats.reduce((max, seat) => Math.max(max, seat.row), 0)
  const studentBySeatId = new Map<string, Student>()
  for (const student of students) {
    const seatId = assignments.get(student.id)
    if (seatId) studentBySeatId.set(seatId, student)
  }

  const deskAtBottom = (teacherDirection === 'south') !== (viewMode === 'back')

  const sortedSeats = [...seats].sort((a, b) => {
    const posA = displayPosition(a, rows, columns, viewMode)
    const posB = displayPosition(b, rows, columns, viewMode)
    return posA.row - posB.row || posA.column - posB.column
  })

  const desk = (
    <div className="mx-auto w-fit rounded border-2 border-green-800 bg-green-700 px-6 py-2 text-center font-bold text-white">
      칠판
    </div>
  )

  return (
    <div className="mb-8">
      {!deskAtBottom && <div className="mb-4">{desk}</div>}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(58px, 1fr))` }}>
        {sortedSeats.map((seat) => {
          const pos = displayPosition(seat, rows, columns, viewMode)
          const student = studentBySeatId.get(seat.id)
          const isFixed = fixedSeatIds.has(seat.id)
          return (
            <button
              key={seat.id}
              type="button"
              onClick={() => onSeatClick(seat.id)}
              style={{ gridRow: pos.row, gridColumn: pos.column }}
              className={seatClassName(seat, isFixed, seat.id === selectedSeatId)}
            >
              {isFixed && <div className="text-[10px]">🔒</div>}
              <div className="mb-1 text-gray-500">
                {seat.row}행 {seat.column}열
              </div>
              {seat.status === 'disabled' ? (
                <strong>사용 안 함</strong>
              ) : seat.status === 'empty' ? (
                <strong className="text-yellow-700">빈자리</strong>
              ) : student ? (
                <strong>{student.name}</strong>
              ) : (
                <strong>—</strong>
              )}
            </button>
          )
        })}
      </div>
      {deskAtBottom && <div className="mt-4">{desk}</div>}
    </div>
  )
}
