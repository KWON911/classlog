import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Sprout } from 'lucide-react'
import { FEEDBACK_DURATION_MS } from '../../lib/growth-garden/constants'

export type GrowthFeedback = {
  /** 매 기록마다 증가 — 같은 문구가 연속으로 나와도 다시 표시된다. */
  id: number
  tone: 'grow' | 'adjust'
  message: string
}

type GrowthFeedbackToastProps = {
  feedback: GrowthFeedback | null
  onDismiss: () => void
}

/**
 * 저장 성공 피드백. 프로젝트에 toast 시스템이 없어 라이브러리를 새로 넣지 않고
 * 성장정원 안에서만 쓰는 최소 구현으로 둔다(다른 화면에는 영향 없음).
 * 벌점은 부정적 표현 대신 중립 문구를 쓴다.
 */
export function GrowthFeedbackToast({ feedback, onDismiss }: GrowthFeedbackToastProps) {
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(onDismiss, FEEDBACK_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [feedback?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4" aria-live="polite">
      <AnimatePresence>
        {feedback && (
          <motion.div
            key={feedback.id}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-[0_4px_16px_rgba(15,23,42,0.14)] ${
              feedback.tone === 'grow' ? 'bg-brand-600 text-white' : 'border border-gray-200 bg-white text-gray-700'
            }`}
          >
            {feedback.tone === 'grow' && <Sprout size={16} aria-hidden="true" />}
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
