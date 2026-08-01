import { useState } from 'react'
import { useStudents } from '../lib/hooks/useStudents'
import { useAttendance } from '../lib/hooks/useAttendance'
import { AttendanceCalendar } from '../components/AttendanceCalendar'
import { DailyStudentAttendance } from '../components/DailyStudentAttendance'
import { MonthlyAttendanceSummary } from '../components/MonthlyAttendanceSummary'

type Tab = 'daily' | 'monthly'

function todayYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(yearMonth: string, delta: number) {
  const [year, month] = yearMonth.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function firstWeekdayOfMonth(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number)
  const total = new Date(year, month, 0).getDate()
  for (let day = 1; day <= total; day++) {
    const dayOfWeek = new Date(year, month - 1, day).getDay()
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      return `${yearMonth}-${String(day).padStart(2, '0')}`
    }
  }
  return `${yearMonth}-01`
}

const tabButtonClass = (active: boolean) =>
  `rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
    active ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
  }`

function MonthNav({ yearMonth, onChange }: { yearMonth: string; onChange: (delta: number) => void }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(-1)}
        className="h-9 w-9 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
      >
        ◀
      </button>
      <span className="text-sm font-medium text-gray-900">{yearMonth}</span>
      <button
        type="button"
        onClick={() => onChange(1)}
        className="h-9 w-9 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
      >
        ▶
      </button>
    </div>
  )
}

export function AttendancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('daily')
  const [yearMonth, setYearMonth] = useState(todayYearMonth())
  const [selectedDate, setSelectedDate] = useState(firstWeekdayOfMonth(todayYearMonth()))

  const { students, error: studentsError } = useStudents()
  const { entries, loading, error, upsertEntry, clearEntry } = useAttendance(yearMonth)

  const changeMonth = (delta: number) => {
    const next = shiftMonth(yearMonth, delta)
    setYearMonth(next)
    setSelectedDate(firstWeekdayOfMonth(next))
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">출결관리</h1>

      <div className="mb-6 flex gap-2 border-b border-gray-200 pb-2">
        <button type="button" onClick={() => setActiveTab('daily')} className={tabButtonClass(activeTab === 'daily')}>
          일일 출결
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('monthly')}
          className={tabButtonClass(activeTab === 'monthly')}
        >
          월간 요약
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {studentsError && (
        <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {studentsError}
        </p>
      )}

      {activeTab === 'daily' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[38%_62%]">
          <div>
            <MonthNav yearMonth={yearMonth} onChange={changeMonth} />
            <AttendanceCalendar
              yearMonth={yearMonth}
              entries={entries}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </div>

          <DailyStudentAttendance
            selectedDate={selectedDate}
            students={students}
            entries={entries}
            loading={loading}
            upsertEntry={upsertEntry}
            clearEntry={clearEntry}
          />
        </div>
      ) : (
        <div>
          <MonthNav yearMonth={yearMonth} onChange={changeMonth} />
          <MonthlyAttendanceSummary yearMonth={yearMonth} students={students} entries={entries} />
        </div>
      )}
    </div>
  )
}
