import type { AttendanceEntry, AttendanceStatus } from '../lib/types'

type AttendanceCalendarProps = {
  yearMonth: string
  entries: AttendanceEntry[]
  selectedDate: string
  onSelectDate: (date: string) => void
}

type DayCell = { day: number; date: string } | null

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금']

const STATUS_BADGE_CLASS: Record<AttendanceStatus, string> = {
  결석: 'bg-red-50 text-red-700',
  지각: 'bg-amber-50 text-amber-700',
  조퇴: 'bg-orange-50 text-orange-700',
  결과: 'bg-purple-50 text-purple-700',
}

function buildWeeks(yearMonth: string): DayCell[][] {
  const [year, month] = yearMonth.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()

  const weeks: DayCell[][] = []
  let currentWeek: DayCell[] = [null, null, null, null, null]
  let started = false

  for (let day = 1; day <= daysInMonth; day++) {
    const dayOfWeek = new Date(year, month - 1, day).getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) continue

    const column = dayOfWeek - 1
    if (column === 0 && started) {
      weeks.push(currentWeek)
      currentWeek = [null, null, null, null, null]
    }

    currentWeek[column] = { day, date: `${yearMonth}-${String(day).padStart(2, '0')}` }
    started = true
  }

  if (started) {
    weeks.push(currentWeek)
  }

  return weeks
}

function todayDateString() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function AttendanceCalendar({ yearMonth, entries, selectedDate, onSelectDate }: AttendanceCalendarProps) {
  const countsByDate = new Map<string, Record<AttendanceStatus, number>>()
  for (const entry of entries) {
    const row = countsByDate.get(entry.date) ?? { 결석: 0, 지각: 0, 조퇴: 0, 결과: 0 }
    row[entry.status] += 1
    countsByDate.set(entry.date, row)
  }

  const weeks = buildWeeks(yearMonth)
  const today = todayDateString()

  return (
    <div>
      <div className="grid grid-cols-5 gap-2">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-sm font-medium text-gray-500">
            {label}
          </div>
        ))}
        {weeks.map((week, weekIndex) =>
          week.map((cell, columnIndex) => {
            if (!cell) {
              return (
                <div
                  key={`${weekIndex}-${columnIndex}`}
                  className="min-h-20 rounded-[10px] border border-transparent p-1.5 text-xs"
                />
              )
            }

            const isSelected = cell.date === selectedDate
            const isToday = cell.date === today
            const counts = countsByDate.get(cell.date)
            const badges = counts
              ? (Object.entries(counts) as [AttendanceStatus, number][]).filter(([, count]) => count > 0)
              : []

            return (
              <button
                type="button"
                key={`${weekIndex}-${columnIndex}`}
                onClick={() => onSelectDate(cell.date)}
                className={`min-h-20 rounded-[10px] border p-1.5 text-left text-xs transition-colors ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50'
                    : isToday
                      ? 'border-blue-200 bg-white hover:bg-gray-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="mb-1 flex items-center gap-1">
                  <span className={isToday ? 'font-semibold text-blue-600' : 'text-gray-500'}>{cell.day}</span>
                  {isToday && <span className="text-[10px] font-medium text-blue-500">오늘</span>}
                </div>
                <div className="flex flex-col gap-0.5">
                  {badges.map(([status, count]) => (
                    <span
                      key={status}
                      className={`rounded px-1 py-0.5 text-[11px] font-medium ${STATUS_BADGE_CLASS[status]}`}
                    >
                      {status} {count}
                    </span>
                  ))}
                </div>
              </button>
            )
          }),
        )}
      </div>
    </div>
  )
}
