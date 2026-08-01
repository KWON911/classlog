import type { AttendanceEntry, Student } from '../lib/types'

type AttendanceCalendarProps = {
  yearMonth: string
  entries: AttendanceEntry[]
  students: Student[]
}

type DayCell = { day: number; date: string } | null

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금']

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

export function AttendanceCalendar({ yearMonth, entries, students }: AttendanceCalendarProps) {
  const studentNameById = new Map(students.map((s) => [s.id, s.name]))

  const entriesByDate = new Map<string, AttendanceEntry[]>()
  for (const entry of entries) {
    const list = entriesByDate.get(entry.date) ?? []
    list.push(entry)
    entriesByDate.set(entry.date, list)
  }

  const weeks = buildWeeks(yearMonth)

  return (
    <div className="mb-8">
      <div className="grid grid-cols-5 gap-2">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-sm font-medium text-gray-500">
            {label}
          </div>
        ))}
        {weeks.map((week, weekIndex) =>
          week.map((cell, columnIndex) => (
            <div
              key={`${weekIndex}-${columnIndex}`}
              className="min-h-20 rounded border border-gray-200 p-1 text-xs"
            >
              {cell && (
                <>
                  <div className="mb-1 text-gray-500">{cell.day}</div>
                  <div className="flex flex-col gap-1">
                    {(entriesByDate.get(cell.date) ?? []).map((entry) => (
                      <div key={entry.id} className="rounded bg-red-50 p-1">
                        <div className="font-medium text-red-600">
                          {entry.reason_category}
                          {entry.status}
                        </div>
                        <div>{studentNameById.get(entry.student_id) ?? '알 수 없음'}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )),
        )}
      </div>
    </div>
  )
}
