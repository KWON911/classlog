import { useCallback, useMemo, useState } from 'react'
import { useSchoolSettings } from '../lib/hooks/useSchoolSettings'
import { WeeklyTimetableCard } from '../components/home/WeeklyTimetableCard'
import { WeeklyMealCard } from '../components/home/WeeklyMealCard'
import { addDays, mondayOf, yyyymmdd } from '../lib/utils/date-utils'

function formatWeekRange(monday: Date, friday: Date) {
  return `${monday.getFullYear()}년 ${monday.getMonth() + 1}월 ${monday.getDate()}일 ~ ${friday.getMonth() + 1}월 ${friday.getDate()}일`
}

const navButtonClass =
  'flex h-9 min-w-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-600 transition-colors hover:bg-gray-50'

export function HomePage() {
  const { settings } = useSchoolSettings()
  const [refreshToken, setRefreshToken] = useState(0)
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const [timetableLoading, setTimetableLoading] = useState(false)
  const [mealLoading, setMealLoading] = useState(false)

  const weekEnd = useMemo(() => addDays(weekStart, 4), [weekStart])
  const isRefreshing = timetableLoading || mealLoading

  // Compare Mondays, not "is today between Mon and Fri" — a weekend date
  // (Sat/Sun) numerically falls after Friday but still belongs to this same
  // Mon-Sun week, and must still show the "이번 주" badge for it.
  const isCurrentWeek = useMemo(() => {
    return yyyymmdd(mondayOf(new Date())) === yyyymmdd(weekStart)
  }, [weekStart])

  const handleRefresh = useCallback(() => {
    if (isRefreshing) return
    setRefreshToken((t) => t + 1)
  }, [isRefreshing])

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">홈</h1>
          <p className="mt-1 text-gray-600">안녕하세요, 권쌤!</p>
          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setWeekStart((prev) => addDays(prev, -7))}
              className={navButtonClass}
              aria-label="이전 주로 이동"
            >
              ‹
            </button>
            <p className="min-w-[190px] text-center text-sm text-gray-500">{formatWeekRange(weekStart, weekEnd)}</p>
            <button
              type="button"
              onClick={() => setWeekStart((prev) => addDays(prev, 7))}
              className={navButtonClass}
              aria-label="다음 주로 이동"
            >
              ›
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(mondayOf(new Date()))}
              className={`${navButtonClass} px-3`}
              aria-label="이번 주로 이동"
            >
              오늘
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="시간표·급식 새로고침"
        >
          {isRefreshing ? '새로고침 중...' : '↻ 새로고침'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,42fr)_minmax(0,58fr)]">
        <WeeklyTimetableCard
          settings={settings}
          weekStart={weekStart}
          refreshToken={refreshToken}
          isCurrentWeek={isCurrentWeek}
          onLoadingChange={setTimetableLoading}
        />
        <WeeklyMealCard
          settings={settings}
          weekStart={weekStart}
          refreshToken={refreshToken}
          isCurrentWeek={isCurrentWeek}
          onLoadingChange={setMealLoading}
        />
      </div>
    </div>
  )
}
