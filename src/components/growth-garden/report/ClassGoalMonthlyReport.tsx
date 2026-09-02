import type { ClassGoalProgress } from '../../../lib/growth-garden/classGoal'
import { classGoalDecorationLabel } from '../../../lib/growth-garden/classGoalDecorations'
import { sectionCardClass } from '../../../lib/ui/classNames'
import type { ClassGardenUnlock, ClassGoal } from '../../../lib/types'

type ClassGoalMonthlyReportProps = {
  goal: ClassGoal | null
  progress: ClassGoalProgress | null
  /** 전역 해금 이력 중, 선택한 리포트 월에 기록된 행만 전달한다. */
  monthlyUnlocks: ClassGardenUnlock[]
}

/**
 * 선택한 달의 공동 목표 결과. 개인별 기여·순위·벌점은 이 섹션에서 다루지 않는다.
 * 해금은 영구 이력이므로, 반드시 목표의 연·월과 일치하는 행만 결과로 표시한다.
 */
export function ClassGoalMonthlyReport({ goal, progress, monthlyUnlocks }: ClassGoalMonthlyReportProps) {
  if (!goal || !progress) return null

  const unlockedThisMonth = monthlyUnlocks.filter(
    (unlock) => unlock.year === goal.year && unlock.month === goal.month,
  )
  const unmetMilestones = goal.milestones.filter((milestone) => progress.score < milestone.point)

  return (
    <section className={sectionCardClass} aria-label={`${goal.month}월 우리 반 공동 목표`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            {goal.month}월 우리 반 공동 목표
          </h2>
          <p className="mt-1 text-sm text-gray-600">우리 반의 상점 기록으로 정리했어요.</p>
        </div>
        <p className="text-lg font-bold tabular-nums text-brand-700">최종 상점 점수 {progress.score}점</p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">이번 달 해금한 장식</h3>
          {unlockedThisMonth.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-brand-700">
              {unlockedThisMonth.map((unlock) => (
                <li key={unlock.id} className="font-medium">✓ {classGoalDecorationLabel(unlock.decoration_type)}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-gray-500">해금한 장식이 없어요.</p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-800">아직 닿지 못한 장식</h3>
          {unmetMilestones.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600">
              {unmetMilestones.map((milestone) => (
                <li key={`${milestone.point}-${milestone.decorationType}`}>○ {classGoalDecorationLabel(milestone.decorationType)}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-brand-700">모든 목표 장식에 닿았어요!</p>
          )}
        </div>
      </div>
    </section>
  )
}
