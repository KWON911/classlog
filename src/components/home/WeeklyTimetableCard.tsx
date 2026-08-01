import { useWeeklyTimetable } from '../../lib/hooks/useWeeklyTimetable'
import { yyyymmdd } from '../../lib/utils/date-utils'
import type { SchoolSettings } from '../../lib/types'
import { EmptyState, ErrorState, LoadingState, UnsetState } from './HomeCardStates'

type WeeklyTimetableCardProps = {
  settings: SchoolSettings | null
  weekStart: Date
  refreshToken: number
}

function formatDayDate(dateStr: string) {
  return `${Number(dateStr.slice(4, 6))}/${Number(dateStr.slice(6, 8))}`
}

export function WeeklyTimetableCard({ settings, weekStart, refreshToken }: WeeklyTimetableCardProps) {
  const { status, days, error, retry } = useWeeklyTimetable(settings, weekStart, refreshToken)
  const todayStr = yyyymmdd(new Date())

  const maxPeriod = Math.max(1, ...days.flatMap((d) => d.periods.map((p) => p.period)))
  const isEmpty = days.every((d) => d.periods.length === 0)

  return (
    <section className="rounded-[14px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">이번 주 시간표</h2>

      {!settings ? (
        <UnsetState message="시간표를 확인하려면 정보관리에서 학교와 학급을 설정해 주세요." />
      ) : status === 'loading' || status === 'idle' ? (
        <LoadingState />
      ) : status === 'error' ? (
        <ErrorState message={error ?? '정보를 불러오지 못했습니다.'} onRetry={retry} />
      ) : isEmpty ? (
        <EmptyState message="이번 주 시간표 정보가 없습니다." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-16 border border-gray-200 bg-[#F1F5F9] py-2 text-xs font-medium text-gray-500">
                  구분
                </th>
                {days.map((day) => (
                  <th
                    key={day.date}
                    className={`border border-gray-200 py-2 text-xs font-medium ${
                      day.date === todayStr ? 'bg-blue-50 text-blue-700' : 'bg-[#F1F5F9] text-gray-500'
                    }`}
                  >
                    <div>{day.dayLabel}</div>
                    <div className="font-normal text-gray-400">{formatDayDate(day.date)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxPeriod }, (_, i) => i + 1).map((period) => (
                <tr key={period}>
                  <td className="border border-gray-200 bg-[#F8FAFC] py-2 text-center text-xs font-medium text-gray-500">
                    {period}교시
                  </td>
                  {days.map((day) => {
                    const item = day.periods.find((p) => p.period === period)
                    return (
                      <td
                        key={day.date}
                        className={`border border-gray-200 py-2 text-center ${
                          day.date === todayStr ? 'bg-blue-50/60' : ''
                        }`}
                      >
                        {item ? item.subject : <span className="text-gray-300">-</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
