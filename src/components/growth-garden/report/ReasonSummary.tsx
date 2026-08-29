import type { ReasonTally } from '../../../lib/growth-garden/monthlyReport'

type ReasonSummaryProps = {
  title: string
  description?: string
  tallies: ReasonTally[]
  tone: 'merit' | 'demerit'
  emptyText: string
  /** 몇 개까지 보여줄지 */
  limit?: number
}

/**
 * 사유별 집계 — 학생 순위가 아니라 "우리 반에 어떤 행동이 많았는지"를 본다.
 * 벌점 쪽도 부정적인 표현 대신 중립적인 문구를 쓰도록 제목을 호출부에서 넘긴다.
 */
export function ReasonSummary({ title, description, tallies, tone, emptyText, limit = 5 }: ReasonSummaryProps) {
  const visible = tallies.slice(0, limit)
  const max = Math.max(1, ...visible.map((item) => item.count))
  const barClass = tone === 'merit' ? 'bg-brand-400' : 'bg-amber-300'

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}

      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">{emptyText}</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-2">
          {visible.map((item) => (
            <li key={item.reason} className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{item.reason}</span>
              <span className="h-2 w-24 overflow-hidden rounded-full bg-gray-100 sm:w-32" aria-hidden="true">
                <span className={`block h-full rounded-full ${barClass}`} style={{ width: `${(item.count / max) * 100}%` }} />
              </span>
              <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900">
                {item.count}회
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
