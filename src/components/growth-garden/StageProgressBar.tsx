import { motion } from 'framer-motion'
import { GROW_ANIMATION_MS } from '../../lib/growth-garden/constants'
import type { StageProgress } from '../../lib/growth-garden/growth'

type StageProgressBarProps = {
  progress: StageProgress
  /** true면 다음 단계까지 남은 점수를 한 줄로 설명한다(상세 화면용). */
  showCaption?: boolean
}

export function StageProgressBar({ progress, showCaption = false }: StageProgressBarProps) {
  const percent = Math.round(progress.ratio * 100)

  return (
    <div className="w-full">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`${progress.current.label} 단계 진행률`}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: progress.current.accent }}
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ duration: GROW_ANIMATION_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {showCaption && (
        <p className="mt-1.5 text-xs text-gray-500">
          {progress.next
            ? `다음 단계 '${progress.next.label}'까지 ${progress.remaining}점 남았어요.`
            : '마지막 단계까지 모두 자랐어요!'}
        </p>
      )}
    </div>
  )
}
