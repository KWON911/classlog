import { useEffect } from 'react'
import { useWeeklyTimetable } from '../../lib/hooks/useWeeklyTimetable'
import { yyyymmdd } from '../../lib/utils/date-utils'
import { classifySubjectDisplay } from '../../lib/utils/subjectDisplay'
import type { SchoolSettings } from '../../lib/types'
import { EmptyState, ErrorState, LoadingState, UnsetState } from './HomeCardStates'

type WeeklyTimetableCardProps = {
  settings: SchoolSettings | null
  weekStart: Date
  refreshToken: number
  isCurrentWeek: boolean
  onLoadingChange?: (loading: boolean) => void
}

function formatDayDate(dateStr: string) {
  return `${Number(dateStr.slice(4, 6))}/${Number(dateStr.slice(6, 8))}`
}

function SubjectCell({ subject }: { subject: string }) {
  const display = classifySubjectDisplay(subject)

  if (/^자율[· ]자치활동$/.test(subject)) {
    return (
      <>
        <span className="block text-[10px] leading-tight tracking-[-0.04em] sm:hidden" aria-label={subject}>
          <span className="block whitespace-nowrap">{subject.slice(0, 3)}</span>
          <span className="block whitespace-nowrap">{subject.slice(3)}</span>
        </span>
        <span className={`hidden sm:inline ${display.fontSizeClass}`}>{display.lines[0]}<wbr />{display.lines[1]}</span>
      </>
    )
  }

  if (display.tier === 1) {
    if (subject.replace(/\s+/g, '').length === 5 && !/\s/.test(subject)) {
      return (
        <>
          <span className={`block leading-tight sm:hidden ${subject === '동아리활동' ? 'text-[10px] tracking-[-0.04em]' : 'text-[13px] tracking-[-0.02em]'}`} aria-label={subject}>
            <span className="block">{subject.slice(0, 3)}</span>
            <span className="block">{subject.slice(3)}</span>
          </span>
          <span className={`hidden whitespace-nowrap tracking-[-0.02em] sm:inline ${display.fontSizeClass}`}>{subject}</span>
        </>
      )
    }
    return <span className={`whitespace-nowrap tracking-[-0.02em] ${display.fontSizeClass}`}>{display.lines[0]}</span>
  }

  const [first, second] = display.lines
  return (
    <span
      className={`inline-block [word-break:keep-all] [overflow-wrap:normal] ${display.fontSizeClass} ${
        display.tier === 3 ? 'line-clamp-2' : ''
      }`}
      title={display.tier === 3 ? subject : undefined}
    >
      {first}
      <wbr />
      {second}
    </span>
  )
}

export function WeeklyTimetableCard({
  settings,
  weekStart,
  refreshToken,
  isCurrentWeek,
  onLoadingChange,
}: WeeklyTimetableCardProps) {
  const { status, days, error, retry } = useWeeklyTimetable(settings, weekStart, refreshToken)
  const todayStr = yyyymmdd(new Date())

  useEffect(() => {
    onLoadingChange?.(status === 'loading')
  }, [status, onLoadingChange])

  const maxPeriod = Math.max(1, ...days.flatMap((d) => d.periods.map((p) => p.period)))
  const isEmpty = days.every((d) => d.periods.length === 0)

  return (
    <section className="min-w-0 rounded-[14px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-900">
        주간 시간표
        {isCurrentWeek && (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">이번 주</span>
        )}
      </h2>

      {!settings ? (
        <UnsetState message="시간표를 확인하려면 정보관리에서 학교와 학급을 설정해 주세요." />
      ) : status === 'loading' || status === 'idle' ? (
        <LoadingState />
      ) : status === 'error' ? (
        <ErrorState message={error ?? '정보를 불러오지 못했습니다.'} onRetry={retry} />
      ) : isEmpty ? (
        <EmptyState message="시간표 정보가 없습니다." />
      ) : (
        <div className="min-w-0 overflow-x-hidden">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-10 sm:w-16" />
              {days.map((day) => (
                <col key={day.date} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="min-w-0 border border-[#E2E8F0] bg-[#F1F5F9] py-2 text-xs font-medium text-gray-500">
                  구분
                </th>
                {days.map((day) => {
                  const isToday = day.date === todayStr
                  return (
                    <th
                      key={day.date}
                      className={`min-w-0 border border-[#E2E8F0] px-1 py-2 text-xs font-medium ${
                        isToday
                          ? 'border-t-[3px] border-t-brand-500 bg-brand-50/70 text-brand-700'
                          : 'bg-[#F1F5F9] text-gray-500'
                      }`}
                    >
                      <div>{day.dayLabel}</div>
                      <div className="font-normal text-gray-400">{formatDayDate(day.date)}</div>
                      {isToday && <div className="mt-0.5 text-[10px] font-medium text-brand-500">오늘</div>}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxPeriod }, (_, i) => i + 1).map((period) => (
                <tr key={period}>
                  <td className="h-14 min-w-0 border border-[#E2E8F0] bg-[#F8FAFC] text-center align-middle text-xs font-medium text-gray-500">
                    {period}교시
                  </td>
                  {days.map((day) => {
                    const item = day.periods.find((p) => p.period === period)
                    const isToday = day.date === todayStr
                    return (
                      <td
                        key={day.date}
                        className={`h-14 min-w-0 border border-[#E2E8F0] px-0.5 text-center align-middle sm:px-1 ${
                          isToday ? 'bg-brand-50/40' : ''
                        }`}
                      >
                        {item ? <SubjectCell subject={item.subject} /> : <span className="text-gray-300">—</span>}
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
