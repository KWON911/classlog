import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useWeeklyAttendance } from '../../lib/hooks/useWeeklyAttendance'
import { groupAttendanceByDate } from '../../lib/utils/weeklyAttendance'
import { weekdaysOf, yyyymmdd } from '../../lib/utils/date-utils'
import { ATTENDANCE_STATUS_COLOR_CLASS } from '../../lib/utils/attendanceStatusColors'
import { EmptyState, ErrorState, LoadingState } from './HomeCardStates'

type WeeklyAttendanceCardProps = {
  weekStart: Date
  refreshToken: number
  isCurrentWeek: boolean
  onLoadingChange?: (loading: boolean) => void
}

function formatDayDate(dateStr: string) {
  return `${Number(dateStr.slice(4, 6))}/${Number(dateStr.slice(6, 8))}`
}

export function WeeklyAttendanceCard({
  weekStart,
  refreshToken,
  isCurrentWeek,
  onLoadingChange,
}: WeeklyAttendanceCardProps) {
  const weekdays = useMemo(() => weekdaysOf(weekStart), [weekStart])
  const { data, loading, error, refetch } = useWeeklyAttendance(weekdays[0], weekdays[4], refreshToken)
  const todayStr = yyyymmdd(new Date())

  useEffect(() => {
    onLoadingChange?.(loading)
  }, [loading, onLoadingChange])

  const days = useMemo(() => groupAttendanceByDate(weekdays, data), [weekdays, data])
  const isEmpty = days.every((d) => d.entries.length === 0)

  return (
    <section className="min-w-0 rounded-[14px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-900">
        주간 출결
        {isCurrentWeek && (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">이번 주</span>
        )}
      </h2>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : isEmpty ? (
        <EmptyState message="이번 주 출결 특이사항이 없습니다." />
      ) : (
        <div className="min-w-0 overflow-x-auto">
          <div className="grid min-w-[480px] grid-cols-5 gap-2 lg:min-w-0">
            {days.map((day) => {
              const isToday = day.date === todayStr
              return (
                <div
                  key={day.date}
                  className={`box-border min-w-0 rounded-lg border p-2.5 ${
                    isToday ? 'border-2 border-brand-500 bg-brand-50/40' : 'border border-gray-200'
                  }`}
                >
                  <div className="mb-2 text-center">
                    <div className={`text-xs font-semibold ${isToday ? 'text-brand-700' : 'text-gray-700'}`}>
                      {day.dayLabel}
                    </div>
                    <div className="text-[11px] text-gray-400">{formatDayDate(day.date)}</div>
                    {isToday && <div className="mt-0.5 text-[10px] font-medium text-brand-500">오늘</div>}
                  </div>

                  {day.entries.length === 0 ? (
                    <p className="text-center text-xs text-gray-400">—</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {day.entries.map((entry) => (
                        <li key={entry.student_id}>
                          <Link
                            to={`/students/${entry.student_id}`}
                            className={`block rounded px-1.5 py-1 text-center text-[11px] font-medium ${ATTENDANCE_STATUS_COLOR_CLASS[entry.status]}`}
                          >
                            {entry.number}번 {entry.name} {entry.status}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
