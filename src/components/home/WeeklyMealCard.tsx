import { useEffect, useState } from 'react'
import { Maximize2 } from 'lucide-react'
import { useWeeklyMeal } from '../../lib/hooks/useWeeklyMeal'
import { stripAllergyCode } from '../../lib/services/neis-service'
import { yyyymmdd } from '../../lib/utils/date-utils'
import type { SchoolSettings } from '../../lib/types'
import { EmptyState, ErrorState, LoadingState, UnsetState } from './HomeCardStates'
import { MealTvDisplayModal } from './MealTvDisplayModal'

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
  const [openDayIndex, setOpenDayIndex] = useState<number | null>(null)

  useEffect(() => {
    onLoadingChange?.(status === 'loading')
  }, [status, onLoadingChange])

  const isEmpty = days.every((d) => d.menus.length === 0)

  return (
    <>
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
          <div className="grid min-w-[480px] grid-cols-5 items-start gap-2 lg:min-w-0">
            {days.map((day, i) => {
              const isToday = day.date === todayStr
              const cellContent = (
                <>
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
                      {day.menus.map((menu, mi) => (
                        <li key={mi} className={`text-center text-[13px] text-gray-700 ${cellTextClass}`}>
                          {stripAllergyCode(menu)}
                        </li>
                      ))}
                    </ul>
                  )}

                  {day.calorie && <p className="mt-2 text-center text-[10px] text-gray-400">{day.calorie}</p>}
                </>
              )

              return day.menus.length > 0 ? (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setOpenDayIndex(i)}
                  aria-label={`${day.dayLabel}요일 식단표 크게 보기`}
                  className={`group relative box-border min-w-0 rounded-lg border p-2.5 text-left transition-colors hover:border-brand-400 hover:bg-brand-50/30 ${
                    isToday ? 'border-2 border-brand-500 bg-brand-50/40' : 'border border-gray-200'
                  }`}
                >
                  {cellContent}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg bg-white/90 opacity-0 transition-opacity group-hover:opacity-100">
                    <Maximize2 size={18} className="text-brand-600" />
                    <span className="text-xs font-semibold text-brand-700">크게 보기</span>
                  </div>
                </button>
              ) : (
                <div
                  key={day.date}
                  className={`box-border min-w-0 rounded-lg border p-2.5 ${
                    isToday ? 'border-2 border-brand-500 bg-brand-50/40' : 'border border-gray-200'
                  }`}
                >
                  {cellContent}
                </div>
              )
            })}
          </div>
        </div>
      )}
      </section>

      {openDayIndex !== null && (
        <MealTvDisplayModal days={days} initialIndex={openDayIndex} onClose={() => setOpenDayIndex(null)} />
      )}
    </>
  )
}
