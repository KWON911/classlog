import { useEffect, useMemo, useState } from 'react'
import { Flag, Settings2, Sparkles } from 'lucide-react'
import type { ClassGoal } from '../../lib/types'
import type { ClassGoalProgress } from '../../lib/growth-garden/classGoal'
import { classGoalDecorationLabel } from '../../lib/growth-garden/classGoalDecorations'
import { GrowthFeedbackToast, type GrowthFeedback } from './GrowthFeedbackToast'

type ClassGoalPanelProps = {
  goal: ClassGoal | null
  progress: ClassGoalProgress | null
  onOpenSettings: () => void
  /** 전체화면에서는 학생 식별을 방해하지 않는 월·점수만 남긴다. */
  compact?: boolean
}

/** 월간 공동 목표의 안내·진행 상태. 학생별 기여도나 순위는 보여주지 않는다. */
export function ClassGoalPanel({ goal, progress, onOpenSettings, compact = false }: ClassGoalPanelProps) {
  const [feedback, setFeedback] = useState<GrowthFeedback | null>(null)
  const newlyUnlockedKey = useMemo(
    () => progress?.newlyReachableMilestones.map((milestone) => milestone.decorationType).join(',') ?? '',
    [progress],
  )

  useEffect(() => {
    if (!newlyUnlockedKey) return
    const labels = newlyUnlockedKey.split(',').map((type) => classGoalDecorationLabel(type as ClassGoal['milestones'][number]['decorationType']))
    setFeedback({ id: Date.now(), tone: 'grow', message: `${labels.join(', ')} 장식을 해금했어요!` })
  }, [newlyUnlockedKey])

  if (!goal || !progress) {
    return (
      <section className="relative z-10 mb-4 rounded-2xl border border-dashed border-brand-200 bg-white/80 px-4 py-3 backdrop-blur-sm" aria-label="우리 반 공동 목표">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-700"><Flag size={16} aria-hidden="true" />우리 반 공동 목표</p>
            <p className="mt-1 text-sm text-gray-600">이번 달 공동 목표를 설정해보세요.</p>
          </div>
          <button type="button" onClick={onOpenSettings} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
            <Settings2 size={15} aria-hidden="true" />공동 목표 만들기
          </button>
        </div>
      </section>
    )
  }

  if (compact) {
    return (
      <section className="relative z-10 mb-3 rounded-xl border border-white/70 bg-white/75 px-3 py-2 text-xs font-semibold text-brand-700 backdrop-blur-sm" aria-label="우리 반 공동 목표">
        {goal.month}월 공동 목표 <span className="ml-1 tabular-nums">{progress.score} / {progress.target}점</span>
      </section>
    )
  }

  const percent = Math.min(100, Math.round((progress.score / progress.target) * 100))
  const remaining = Math.max(0, progress.target - progress.score)
  const nextLabel = progress.nextMilestone ? classGoalDecorationLabel(progress.nextMilestone.decorationType) : null

  return (
    <>
      <section className="relative z-10 mb-4 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur-sm" aria-label="우리 반 공동 목표">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-[160px] flex-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-700"><Flag size={16} aria-hidden="true" />{goal.month}월 우리 반 공동 목표</p>
            <p className="mt-0.5 text-xs text-gray-600">
              {progress.completed ? '이번 달 목표를 함께 완성했어요!' : nextLabel ? `다음 장식: ${nextLabel}` : '마지막 장식에 도전하고 있어요.'}
            </p>
          </div>
          <p className="text-right text-lg font-bold tabular-nums text-brand-700">{progress.score} <span className="text-sm font-medium text-gray-500">/ {progress.target}점</span></p>
          <button type="button" onClick={onOpenSettings} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
            <Settings2 size={14} aria-hidden="true" />설정
          </button>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-50" role="progressbar" aria-label="공동 목표 진행률" aria-valuemin={0} aria-valuemax={progress.target} aria-valuenow={Math.min(progress.score, progress.target)}>
          <div className="h-full rounded-full bg-brand-500 transition-[width]" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
          {progress.milestones.map((milestone) => (
            <span key={`${milestone.point}-${milestone.decorationType}`} className={milestone.reached ? 'font-semibold text-brand-700' : ''}>
              {milestone.reached ? '✓' : '○'} {classGoalDecorationLabel(milestone.decorationType)}
            </span>
          ))}
          <span className="ml-auto font-medium text-gray-700">{progress.completed ? <><Sparkles className="mr-1 inline" size={13} aria-hidden="true" />목표 완료!</> : `${remaining}점 남았어요`}</span>
        </div>
      </section>
      <GrowthFeedbackToast feedback={feedback} onDismiss={() => setFeedback(null)} />
    </>
  )
}
