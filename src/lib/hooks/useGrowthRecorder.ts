import { useCallback, useState } from 'react'
import type { BehaviorModalTarget } from '../../components/growth-garden/BehaviorPointModal'
import type { GrowthFeedback } from '../../components/growth-garden/GrowthFeedbackToast'
import type { GrowthPointType, Student } from '../types'

type RecorderDeps = {
  addPoint: (
    studentId: string,
    type: GrowthPointType,
    amount: number,
    reason: string,
  ) => Promise<{ data?: unknown; error?: string }>
  /** 식물 애니메이션 신호 (usePlantPulse.trigger) */
  trigger: (studentId: string, type: GrowthPointType) => void
}

/**
 * "모달 열기 → 저장 → 애니메이션 → 피드백" 한 흐름을 담는 훅.
 * 정원 목록과 학생 상세가 같은 동작을 해야 해서 한 곳에 모았다.
 */
export function useGrowthRecorder({ addPoint, trigger }: RecorderDeps) {
  const [target, setTarget] = useState<BehaviorModalTarget | null>(null)
  const [feedback, setFeedback] = useState<GrowthFeedback | null>(null)

  const open = useCallback(
    (student: Student, type: GrowthPointType, options?: { allowTypeChange?: boolean }) => {
      setTarget({ student, type, allowTypeChange: options?.allowTypeChange })
    },
    [],
  )

  const close = useCallback(() => setTarget(null), [])

  const submit = useCallback(
    async (type: GrowthPointType, amount: number, reason: string) => {
      if (!target) return
      const studentId = target.student.id
      const result = await addPoint(studentId, type, amount, reason)
      if (result.error) return

      setTarget(null)
      // 저장 성공 후에만 식물이 움직인다 — 실패한 기록으로 단계가 바뀌면 안 된다.
      trigger(studentId, type)
      setFeedback({
        id: Date.now(),
        tone: type === 'merit' ? 'grow' : 'adjust',
        message: type === 'merit' ? `+${amount} 성장!` : '성장 포인트가 조정되었습니다.',
      })
    },
    [target, addPoint, trigger],
  )

  const dismissFeedback = useCallback(() => setFeedback(null), [])

  return { target, open, close, submit, feedback, dismissFeedback }
}
