import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStudents } from '../lib/hooks/useStudents'
import { useAttendance } from '../lib/hooks/useAttendance'
import { useSchoolSettings } from '../lib/hooks/useSchoolSettings'
import { useSchoolEvents } from '../lib/hooks/useSchoolEvents'
import { useStudentAttendanceHistory } from '../lib/hooks/useStudentAttendanceHistory'
import { filterEventsByDateForGrade } from '../lib/utils/schoolEvents'
import { AttendanceCalendar } from '../components/AttendanceCalendar'
import { DailyStudentAttendance } from '../components/DailyStudentAttendance'
import { MonthlyAttendanceSummary } from '../components/MonthlyAttendanceSummary'
import { PageContainer } from '../components/PageContainer'
import { StudentAttendanceHistory } from '../components/StudentAttendanceHistory'
import type { AttendanceStatus } from '../lib/types'

type Tab = 'daily' | 'monthly' | 'history'
const ATTENDANCE_STATUSES: AttendanceStatus[] = ['결석', '지각', '조퇴', '결과']

function todayYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function todayDateString() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
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

function parseDateParam(dateParam: string | null): { yearMonth: string; selectedDate: string } | null {
  if (!dateParam || !/^\d{8}$/.test(dateParam)) return null
  const year = dateParam.slice(0, 4)
  const month = dateParam.slice(4, 6)
  const day = dateParam.slice(6, 8)
  return { yearMonth: `${year}-${month}`, selectedDate: `${year}-${month}-${day}` }
}

const tabButtonClass = (active: boolean) =>
  `rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
    active ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'
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
  const [searchParams] = useSearchParams()
  const dateFromQuery = parseDateParam(searchParams.get('date'))
  const highlightStudentId = searchParams.get('student') ?? undefined
  const historyStudentId = searchParams.get('view') === 'history' ? searchParams.get('student') ?? undefined : undefined
  const statusParam = searchParams.get('status')
  const historyStatus = ATTENDANCE_STATUSES.find((status) => status === statusParam)

  const [activeTab, setActiveTab] = useState<Tab>(historyStudentId ? 'history' : 'daily')
  const [yearMonth, setYearMonth] = useState(dateFromQuery?.yearMonth ?? todayYearMonth())
  const [selectedDate, setSelectedDate] = useState(dateFromQuery?.selectedDate ?? todayDateString())
  const [selectedHistoryStudentId, setSelectedHistoryStudentId] = useState(historyStudentId ?? '')
  const [selectedHistoryStatus, setSelectedHistoryStatus] = useState<AttendanceStatus | undefined>(historyStatus)

  const { students, error: studentsError } = useStudents()
  const historyStudent = students.find((student) => student.id === selectedHistoryStudentId)
  const history = useStudentAttendanceHistory(selectedHistoryStudentId || undefined, selectedHistoryStatus)
  const { entries, loading, error, upsertEntry, clearEntry, deleteEntry, updateEntryFlags } = useAttendance(yearMonth)
  const { settings: schoolSettings } = useSchoolSettings()
  const { eventsByDate: rawEventsByDate, status: eventsStatus } = useSchoolEvents(schoolSettings, yearMonth)

  const eventsByDate = useMemo(
    () => (schoolSettings ? filterEventsByDateForGrade(rawEventsByDate, schoolSettings.grade) : {}),
    [rawEventsByDate, schoolSettings],
  )
  const selectedDateEvents = eventsByDate[selectedDate.replace(/-/g, '')] ?? []

  const changeMonth = (delta: number) => {
    const next = shiftMonth(yearMonth, delta)
    setYearMonth(next)
    setSelectedDate(firstWeekdayOfMonth(next))
  }

  return (
    <PageContainer size="wide">
      <h1 className="mb-4 text-2xl font-semibold text-brand-700">출결관리</h1>

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
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={tabButtonClass(activeTab === 'history')}
        >
          개인별 이력
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(360px,35fr)_minmax(0,65fr)]">
          <div>
            <MonthNav yearMonth={yearMonth} onChange={changeMonth} />
            {!schoolSettings ? (
              <p className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                학사일정을 확인하려면 정보관리에서 학교를 설정해 주세요.
              </p>
            ) : (
              eventsStatus === 'error' && (
                <p className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                  학사일정을 불러오지 못했습니다.
                </p>
              )
            )}
            <AttendanceCalendar
              yearMonth={yearMonth}
              entries={entries}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              eventsByDate={eventsByDate}
            />
          </div>

          <div className="min-w-0">
            <DailyStudentAttendance
              selectedDate={selectedDate}
              students={students}
              entries={entries}
              loading={loading}
              events={selectedDateEvents}
              upsertEntry={upsertEntry}
              clearEntry={clearEntry}
              highlightStudentId={highlightStudentId}
            />
          </div>
        </div>
      ) : activeTab === 'monthly' ? (
        <div>
          <MonthNav yearMonth={yearMonth} onChange={changeMonth} />
          <MonthlyAttendanceSummary
            students={students}
            entries={entries}
            deleteEntry={deleteEntry}
            updateEntryFlags={updateEntryFlags}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-gray-700">
              학생 선택
              <select
                value={selectedHistoryStudentId}
                onChange={(event) => setSelectedHistoryStudentId(event.target.value)}
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="">학생을 선택하세요</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.number}. {student.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-gray-700">
              상태 필터
              <select
                value={selectedHistoryStatus ?? ''}
                onChange={(event) => setSelectedHistoryStatus((event.target.value || undefined) as AttendanceStatus | undefined)}
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="">전체</option>
                {ATTENDANCE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <StudentAttendanceHistory student={historyStudent} status={selectedHistoryStatus} {...history} />
        </div>
      )}
    </PageContainer>
  )
}
