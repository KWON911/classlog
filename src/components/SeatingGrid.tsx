import 'pretendard/dist/web/variable/pretendardvariable.css'
import { mapGender } from '../lib/seating'
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

function seatClassName(seat: Seat, occupantGender: 'male' | 'female' | 'unspecified', isFixed: boolean, isSelected: boolean) {
  const classes = [
    'relative',
    'flex',
    'min-h-[96px]',
    'items-center',
    'justify-center',
    'rounded',
    'border',
    'p-2',
  ]
  const effectiveGender = seat.genderSeat ?? (occupantGender !== 'unspecified' ? occupantGender : undefined)
  if (seat.status === 'disabled') classes.push('border-dashed', 'bg-gray-200', 'text-gray-500')
  else if (seat.status === 'empty') classes.push('border-yellow-400', 'bg-yellow-50')
  else if (effectiveGender === 'male') classes.push('border-blue-400', 'bg-blue-50')
  else if (effectiveGender === 'female') classes.push('border-pink-400', 'bg-pink-50')
  else if (isFixed) classes.push('border-green-500', 'bg-green-50')
  else classes.push('border-gray-300', 'bg-white')
  if (isFixed && effectiveGender) {
    classes.push(effectiveGender === 'male' ? 'shadow-[inset_0_0_0_2px_#4d88df]' : 'shadow-[inset_0_0_0_2px_#df76a4]')
  }
  if (isSelected) classes.push('ring-2', 'ring-yellow-500')
  return classes.join(' ')
}

const LEGEND_ITEMS: { label: string; className: string }[] = [
  { label: '사용 가능', className: 'border-gray-300 bg-white' },
  { label: '학생 고정', className: 'border-green-500 bg-green-50' },
  { label: '남학생 자리', className: 'border-blue-400 bg-blue-50' },
  { label: '여학생 자리', className: 'border-pink-400 bg-pink-50' },
  { label: '빈자리', className: 'border-yellow-400 bg-yellow-50' },
  { label: '사용 안 함', className: 'border-dashed border-gray-400 bg-gray-200' },
]

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
  const isBackView = viewMode === 'back'

  const sortedSeats = [...seats].sort((a, b) => {
    const posA = displayPosition(a, rows, columns, viewMode)
    const posB = displayPosition(b, rows, columns, viewMode)
    return posA.row - posB.row || posA.column - posB.column
  })

  // Desk sits in its own mini-grid sharing the seat grid's column tracks, so
  // spanning 2 tracks makes it exactly 2 seat-widths wide (plus the gap
  // between them) regardless of how many columns or how wide the page is.
  const deskSpan = Math.min(2, columns)
  const deskStart = Math.max(1, Math.floor((columns - deskSpan) / 2) + 1)

  const desk = (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(70px, 1fr))` }}
    >
      <div
        className="rounded border-2 border-green-800 bg-green-700 py-3 text-center text-lg font-bold text-white"
        style={{ gridColumn: `${deskStart} / span ${deskSpan}` }}
      >
        칠판
      </div>
    </div>
  )

  return (
    <div className="mb-8" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
      <p className="mb-3 text-sm text-gray-600 print:hidden">
        {isBackView
          ? '현재: 뒤에서 볼 때 — 교실 뒤쪽에서 칠판을 바라보는 모습입니다.'
          : '현재: 교사 시점 — 칠판에서 학생을 바라보는 모습입니다.'}
      </p>

      <div className="mb-3 flex flex-wrap gap-3 text-xs text-gray-600 print:hidden">
        {LEGEND_ITEMS.map((item) => (
          <span key={item.label} className="flex items-center gap-1">
            <i className={`inline-block h-3 w-3 rounded border ${item.className}`} />
            {item.label}
          </span>
        ))}
      </div>

      {!deskAtBottom && <div className="mb-4">{desk}</div>}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(70px, 1fr))` }}>
        {sortedSeats.map((seat) => {
          const pos = displayPosition(seat, rows, columns, viewMode)
          const student = studentBySeatId.get(seat.id)
          const isFixed = fixedSeatIds.has(seat.id)
          const occupantGender = student ? mapGender(student.gender) : 'unspecified'
          return (
            <button
              key={seat.id}
              type="button"
              onClick={() => onSeatClick(seat.id)}
              style={{ gridRow: pos.row, gridColumn: pos.column }}
              className={seatClassName(seat, occupantGender, isFixed, seat.id === selectedSeatId)}
            >
              <span className="absolute left-1 top-1 text-[10px] text-gray-500">
                {seat.row}행 {seat.column}열
              </span>
              {isFixed && <span className="absolute right-1 top-1 text-[10px]">🔒</span>}
              {seat.status === 'disabled' ? (
                <strong className="text-sm">사용 안 함</strong>
              ) : seat.status === 'empty' ? (
                <strong className="text-sm text-yellow-700">빈자리</strong>
              ) : student ? (
                <strong className="w-full truncate px-1 text-2xl font-bold leading-tight">{student.name}</strong>
              ) : (
                <strong className="text-lg text-gray-300">—</strong>
              )}
            </button>
          )
        })}
      </div>
      {deskAtBottom && <div className="mt-4">{desk}</div>}

      <div className="mt-3 flex justify-between text-xs text-gray-500">
        <span>{isBackView ? '복도 쪽' : '창가 쪽'}</span>
        <span>{isBackView ? '창가 쪽' : '복도 쪽'}</span>
      </div>
    </div>
  )
}
