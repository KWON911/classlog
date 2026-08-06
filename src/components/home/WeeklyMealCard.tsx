import { useEffect } from 'react'
import { useWeeklyMeal } from '../../lib/hooks/useWeeklyMeal'
import { stripAllergyCode } from '../../lib/services/neis-service'
import { yyyymmdd } from '../../lib/utils/date-utils'
import type { SchoolSettings } from '../../lib/types'
import { EmptyState, ErrorState, LoadingState, UnsetState } from './HomeCardStates'

type WeeklyMealCardProps = {
  settings: SchoolSettings | null
  weekStart: Date
  refreshToken: number
  isCurrentWeek: boolean
  onLoadingChange?: (loading: boolean) => void
}

const cellTextClass = '[word-break:keep-all] [overflow-wrap:anywhere]'

function formatDayDate(dateStr: string) {
  return `${Number(dateStr.slice(4, 6))}/${Number(dateStr.slice(6, 8))}`
}

export function WeeklyMealCard({
  settings,
  weekStart,
  refreshToken,
  isCurrentWeek,
  onLoadingChange,
}: WeeklyMealCardProps) {
  const { status, days, error, retry } = useWeeklyMeal(settings, weekStart, refreshToken)
  const todayStr = yyyymmdd(new Date())

  useEffect(() => {
    onLoadingChange?.(status === 'loading')
  }, [status, onLoadingChange])

  const isEmpty = days.every((d) => d.menus.length === 0)

  return (
    <section className="min-w-0 rounded-[14px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-900">
        주간 식단표
        {isCurrentWeek && (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">이번 주</span>
        )}
      </h2>

      {!settings ? (
        <UnsetState message="식단표를 확인하려면 정보관리에서 학교와 학급을 설정해 주세요." />
      ) : status === 'loading' || status === 'idle' ? (
        <LoadingState />
      ) : status === 'error' ? (
        <ErrorState message={error ?? '정보를 불러오지 못했습니다.'} onRetry={retry} />
      ) : isEmpty ? (
        <EmptyState message="급식 정보가 없습니다." />
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

                  {day.menus.length === 0 ? (
                    <p className="text-center text-xs text-gray-400">급식 없음</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {day.menus.map((menu, i) => (
                        <li key={i} className={`text-center text-[13px] text-gray-700 ${cellTextClass}`}>
                          {stripAllergyCode(menu)}
                        </li>
                      ))}
                    </ul>
                  )}

                  {day.calorie && <p className="mt-2 text-center text-[10px] text-gray-400">{day.calorie}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
