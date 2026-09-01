import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Sprout } from 'lucide-react'
import { ENVIRONMENT_TRANSITION_MS } from '../../lib/growth-garden/constants'
import type { GardenEnvironment } from '../../lib/growth-garden/environment'

type ClassGardenSummaryProps = {
  environment: GardenEnvironment
  /** 오른쪽 끝에 놓을 버튼(전체화면 토글) */
  action?: ReactNode
  /** 전체화면일 때 보여줄 한 줄 안내 */
  hint?: string
}

/**
 * 정원 보기 상단의 학급 정원 상태 — 통계표가 아니라 정원이 얼마나 자랐는지
 * 이야기하듯 보여준다. 이름 앞의 Class는 학생 한 명의 요약(`GardenSummary` 타입)과
 * 구분하기 위한 것.
 */
export function ClassGardenSummary({ environment, action, hint }: ClassGardenSummaryProps) {
  const { current, next, totalScore, remainingPoints, ratio } = environment
  const percent = Math.round(ratio * 100)

  return (
    <div className="relative z-10 mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-white/70 bg-white/75 px-4 py-3 backdrop-blur-sm">
      {/* min-w-0만 두면 전체화면 버튼에 밀려 제목이 한 글자씩 줄바꿈된다. */}
      <div className="min-w-[190px] flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-700">
          <Sprout size={16} aria-hidden="true" />
          우리 반 정원 · {current.label}
        </p>
        <p className="mt-0.5 text-xs text-gray-600">
          {current.message}
          {hint && <span className="ml-1.5 text-gray-400">{hint}</span>}
        </p>
      </div>

      <div className="w-full sm:w-56">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-white/80"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={`${current.label} 진행률`}
        >
          <motion.div
            className="h-full rounded-full bg-brand-500"
            initial={false}
            animate={{ width: `${percent}%` }}
            transition={{ duration: ENVIRONMENT_TRANSITION_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <p className="mt-1 text-[11px] text-gray-600">
          {next ? `${next.label}까지 ${remainingPoints}점 남았어요.` : '정원이 끝까지 자랐어요!'}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-lg font-bold tabular-nums text-brand-700">{totalScore}</p>
        <p className="text-[11px] text-gray-500">우리 반 전체 성장 포인트</p>
      </div>

      {action && <div data-testid="garden-scene-action" className="ml-auto shrink-0">{action}</div>}
    </div>
  )
}
