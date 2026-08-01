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

function seatClassName(
  seat: Seat,
  effectiveGender: 'male' | 'female' | undefined,
  isSelected: boolean,
) {
  const classes = [
    'relative',
    'flex',
    'min-h-[82px]',
    'items-center',
    'justify-center',
    'rounded-lg',
    'border',
    'px-2',
    'py-1',
    'transition-transform',
    'duration-150',
    'hover:-translate-y-0.5',
  ]
  if (seat.status === 'disabled') {
    classes.push('border-dashed', 'border-gray-300', 'bg-gray-100', 'text-gray-400', 'opacity-60')
  } else if (seat.status === 'empty') {
    classes.push('border-dashed', 'border-gray-300', 'bg-gray-50', 'text-gray-500')
  } else {
    classes.push('border-gray-200', 'bg-white')
    if (effectiveGender === 'male') classes.push('border-t-2', 'border-t-blue-400')
    else if (effectiveGender === 'female') classes.push('border-t-2', 'border-t-pink-400')
  }
  if (isSelected) classes.push('ring-2', 'ring-yellow-500')
  return classes.join(' ')
}

const LEGEND_ITEMS: { label: string; dotClassName?: string; icon?: string }[] = [
  { label: '사용 가능', dotClassName: 'border border-gray-300 bg-white' },
  { label: '학생 고정', icon: '📌' },
  { label: '남학생 자리', dotClassName: 'bg-blue-400' },
  { label: '여학생 자리', dotClassName: 'bg-pink-400' },
  { label: '빈자리', dotClassName: 'border border-dashed border-gray-400 bg-gray-100' },
  { label: '사용 안 함', dotClassName: 'bg-gray-300 opacity-60' },
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
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(104px, 1fr))` }}>
      <div
        className="rounded-lg bg-slate-700 py-2 text-center text-sm font-bold text-white"
        style={{ gridColumn: `${deskStart} / span ${deskSpan}` }}
      >
        칠판
      </div>
    </div>
  )

  return (
    <div
      className="mb-8 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-6"
      style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
    >
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        {LEGEND_ITEMS.map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-600"
          >
            {item.icon ? (
              <span className="text-xs leading-none">{item.icon}</span>
            ) : (
              <span className={`h-2 w-2 rounded-full ${item.dotClassName}`} />
            )}
            {item.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        {!deskAtBottom && <div className="mb-3">{desk}</div>}
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(104px, 1fr))` }}>
          {sortedSeats.map((seat) => {
            const pos = displayPosition(seat, rows, columns, viewMode)
            const student = studentBySeatId.get(seat.id)
            const isFixed = fixedSeatIds.has(seat.id)
            const occupantGender = student ? mapGender(student.gender) : 'unspecified'
            const effectiveGender = seat.genderSeat ?? (occupantGender !== 'unspecified' ? occupantGender : undefined)
            const showGenderBadge = effectiveGender && seat.status === 'available'
            return (
              <button
                key={seat.id}
                type="button"
                onClick={() => onSeatClick(seat.id)}
                style={{ gridRow: pos.row, gridColumn: pos.column }}
                className={seatClassName(seat, effectiveGender, seat.id === selectedSeatId)}
              >
                <span className="absolute left-1 top-1 text-[10px] text-gray-500">
                  {seat.row}행 {seat.column}열
                </span>
                {isFixed && <span className="absolute right-1 top-1 text-[10px]">📌</span>}
                {showGenderBadge && (
                  <span
                    className={`absolute bottom-1 right-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                      effectiveGender === 'male' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'
                    }`}
                  >
                    {effectiveGender === 'male' ? '남' : '여'}
                  </span>
                )}
                {seat.status === 'disabled' ? (
                  <strong className="text-sm">사용 안 함</strong>
                ) : seat.status === 'empty' ? (
                  <strong className="text-sm text-gray-500">빈자리</strong>
                ) : student ? (
                  <strong
                    className="w-full truncate px-1"
                    style={{ fontSize: 'clamp(26px, 2.1vw, 34px)', fontWeight: 800, lineHeight: 1.1, whiteSpace: 'nowrap' }}
                  >
                    {student.name}
                  </strong>
                ) : (
                  <strong className="text-lg text-gray-300">—</strong>
                )}
              </button>
            )
          })}
        </div>
        {deskAtBottom && <div className="mt-3">{desk}</div>}
      </div>

      <div className="mt-3 flex justify-between text-xs text-gray-500">
        <span>← {isBackView ? '복도 쪽' : '창가 쪽'}</span>
        <span>{isBackView ? '창가 쪽' : '복도 쪽'} →</span>
      </div>
    </div>
  )
}
