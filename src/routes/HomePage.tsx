import { useMemo, useState } from 'react'
import { useSchoolSettings } from '../lib/hooks/useSchoolSettings'
import { WeeklyTimetableCard } from '../components/home/WeeklyTimetableCard'
import { WeeklyMealCard } from '../components/home/WeeklyMealCard'
import { addDays, mondayOf } from '../lib/utils/date-utils'

function formatWeekRange(monday: Date, friday: Date) {
  return `${monday.getFullYear()}년 ${monday.getMonth() + 1}월 ${monday.getDate()}일 ~ ${friday.getMonth() + 1}월 ${friday.getDate()}일`
}

export function HomePage() {
  const { settings } = useSchoolSettings()
  const [refreshToken, setRefreshToken] = useState(0)

  const weekStart = useMemo(() => mondayOf(new Date()), [])
  const weekEnd = useMemo(() => addDays(weekStart, 4), [weekStart])

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">홈</h1>
          <p className="mt-1 text-gray-600">안녕하세요, 권쌤!</p>
          <p className="mt-1 text-sm text-gray-400">{formatWeekRange(weekStart, weekEnd)}</p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshToken((t) => t + 1)}
          className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          aria-label="시간표·급식 새로고침"
        >
          ↻ 새로고침
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[55%_45%]">
        <WeeklyTimetableCard settings={settings} weekStart={weekStart} refreshToken={refreshToken} />
        <WeeklyMealCard settings={settings} weekStart={weekStart} refreshToken={refreshToken} />
      </div>
    </div>
  )
}
