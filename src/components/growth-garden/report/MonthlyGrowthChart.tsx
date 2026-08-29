import type { DailyPoint } from '../../../lib/growth-garden/monthlyReport'

type MonthlyGrowthChartProps = {
  daily: DailyPoint[]
}

/**
 * 일별 상점/벌점 막대. 차트 라이브러리를 새로 넣지 않고 SVG로 그린다 —
 * "이번 달 어느 시기에 기록이 많았는지"만 보이면 되는 용도라 그 이상은 과하다.
 */
export function MonthlyGrowthChart({ daily }: MonthlyGrowthChartProps) {
  const max = Math.max(1, ...daily.map((point) => Math.max(point.merit, point.demerit)))
  const hasAny = daily.some((point) => point.merit > 0 || point.demerit > 0)

  if (!hasAny) {
    return <p className="py-8 text-center text-sm text-gray-500">이번 달에는 아직 기록이 없어요.</p>
  }

  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height: 132 }}>
        {daily.map((point) => {
          const meritHeight = (point.merit / max) * 100
          const demeritHeight = (point.demerit / max) * 100
          const label = `${point.day}일 상점 ${point.merit}점, 벌점 ${point.demerit}점`
          return (
            <div key={point.day} className="flex h-full flex-1 flex-col justify-end gap-[2px]" title={label}>
              <div
                className="rounded-t-[3px] bg-brand-500"
                style={{ height: `${meritHeight}%` }}
                aria-hidden="true"
              />
              <div
                className="rounded-b-[3px] bg-rose-300"
                style={{ height: `${demeritHeight}%` }}
                aria-hidden="true"
              />
            </div>
          )
        })}
      </div>

      {/* 날짜 눈금 — 모든 날짜를 적으면 빽빽해서 5일 간격으로만 표시한다. */}
      <div className="mt-1 flex gap-[3px]">
        {daily.map((point) => (
          <span key={point.day} className="flex-1 text-center text-[10px] text-gray-400">
            {point.day === 1 || point.day % 5 === 0 ? point.day : ''}
          </span>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" aria-hidden="true" /> 상점
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-300" aria-hidden="true" /> 벌점
        </span>
      </div>
    </div>
  )
}
