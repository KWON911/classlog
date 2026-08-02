import { isNonInstructionalDay, summarizeEventBadge } from '../lib/utils/schoolEvents'
import type { AttendanceEntry, AttendanceStatus, SchoolEventByDate } from '../lib/types'

type AttendanceCalendarProps = {
  yearMonth: string
  entries: AttendanceEntry[]
  selectedDate: string
  onSelectDate: (date: string) => void
  /** Already grade-filtered by the caller; keyed 'YYYYMMDD'. */
  eventsByDate?: SchoolEventByDate
}

type DayCell = { day: number; date: string } | null

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금']

const TAG_BASE_CLASS = 'block truncate rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium leading-tight'

const STATUS_BADGE_CLASS: Record<AttendanceStatus, string> = {
  결석: 'bg-red-50 text-red-700',
  지각: 'bg-amber-50 text-amber-700',
  조퇴: 'bg-purple-50 text-purple-700',
  결과: 'bg-teal-50 text-teal-700',
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

export function AttendanceCalendar({
  yearMonth,
  entries,
  selectedDate,
  onSelectDate,
  eventsByDate,
}: AttendanceCalendarProps) {
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
                  className="min-h-20 rounded-[10px] border border-transparent p-2"
                />
              )
            }

            const isSelected = cell.date === selectedDate
            const isToday = cell.date === today
            const counts = countsByDate.get(cell.date)
            const badges = counts
              ? (Object.entries(counts) as [AttendanceStatus, number][]).filter(([, count]) => count > 0)
              : []
            const events = eventsByDate?.[cell.date.replace(/-/g, '')] ?? []
            const nonInstructional = isNonInstructionalDay(events)
            const eventBadgeText = summarizeEventBadge(events)

            // Four distinct states: default, today, selected, and today+selected
            // together — border carries the "today" signal, background carries
            // the "selected" signal, so the combined state simply layers both.
            const cellStateClass = isToday
              ? isSelected
                ? 'border-2 border-blue-700 bg-blue-50'
                : 'border-2 border-blue-700 bg-white hover:bg-gray-50'
              : isSelected
                ? 'border border-blue-300 bg-blue-50'
                : 'border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'

            const dayNumberClass = isToday || isSelected ? 'text-blue-800' : 'text-gray-500'

            return (
              <button
                type="button"
                key={`${weekIndex}-${columnIndex}`}
                onClick={() => onSelectDate(cell.date)}
                className={`flex min-h-20 flex-col rounded-[10px] p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-1 ${cellStateClass}`}
              >
                <span className={`text-sm font-medium ${dayNumberClass}`}>{cell.day}</span>

                <div className="mt-1.5 flex flex-col gap-1">
                  {nonInstructional ? (
                    <span className={`${TAG_BASE_CLASS} bg-gray-200 text-gray-600`}>수업일 아님</span>
                  ) : (
                    eventBadgeText && (
                      <span className={`${TAG_BASE_CLASS} bg-blue-50 text-blue-600`} title={eventBadgeText}>
                        {eventBadgeText}
                      </span>
                    )
                  )}

                  {badges.map(([status, count]) => (
                    <span key={status} className={`${TAG_BASE_CLASS} ${STATUS_BADGE_CLASS[status]}`}>
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
