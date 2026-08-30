import { useCallback, useState } from 'react'
import type { BehaviorModalTarget } from '../../components/growth-garden/BehaviorPointModal'
import type { GrowthFeedback } from '../../components/growth-garden/GrowthFeedbackToast'
import { BULK_PULSE_LIMIT } from '../growth-garden/constants'
import type { BulkPointInput } from '../growth-garden/bulkGrowth'
import type { GrowthPointType, Student } from '../types'

type BulkResult = { data?: unknown; error?: string; count?: number; batchId?: string }

type RecorderDeps = {
  addPoint: (
    studentId: string,
    type: GrowthPointType,
    amount: number,
    reason: string,
  ) => Promise<{ data?: unknown; error?: string }>
  /** 선택 학생 일괄 기록. 없으면 개별 기록만 쓰는 화면(학생 상세)이다. */
  addBulkPoints?: (input: BulkPointInput) => Promise<BulkResult>
  /** 식물 애니메이션 신호 (usePlantPulse.trigger) */
  trigger: (studentId: string, type: GrowthPointType) => void
  /** 일괄 저장 성공 후 호출 — 선택 해제 같은 화면 쪽 뒷정리에 쓴다. */
  onBulkSaved?: (count: number) => void
}

/** 확인 창에서 보여줄, 아직 저장하지 않은 일괄 기록 내용 */
export type PendingBulk = {
  students: Student[]
  type: GrowthPointType
  amount: number
  reason: string
}

/**
 * "모달 열기 → 저장 → 애니메이션 → 피드백" 한 흐름을 담는 훅.
 * 정원 목록과 학생 상세가 같은 동작을 해야 해서 한 곳에 모았다.
 *
 * 개별 기록과 일괄 기록이 같은 입력 모달을 쓰고 같은 성공 흐름을 탄다 — 다른 점은
 * 여러 학생의 데이터가 한꺼번에 바뀌는 일괄 기록에만 저장 직전 확인 단계가 있다는 것뿐이다.
 */
export function useGrowthRecorder({ addPoint, addBulkPoints, trigger, onBulkSaved }: RecorderDeps) {
  const [target, setTarget] = useState<BehaviorModalTarget | null>(null)
  const [pendingBulk, setPendingBulk] = useState<PendingBulk | null>(null)
  const [feedback, setFeedback] = useState<GrowthFeedback | null>(null)

  const open = useCallback(
    (student: Student, type: GrowthPointType, options?: { allowTypeChange?: boolean }) => {
      setTarget({ students: [student], type, allowTypeChange: options?.allowTypeChange })
    },
    [],
  )

  /** 선택 학생 일괄 기록 열기 — 대상만 다르고 입력 화면은 개별 기록과 같다. */
  const openBulk = useCallback((students: Student[], type: GrowthPointType) => {
    if (students.length === 0) return
    setTarget({ students, type })
  }, [])

  const close = useCallback(() => setTarget(null), [])

  const submit = useCallback(
    async (type: GrowthPointType, amount: number, reason: string) => {
      if (!target) return

      // 여러 학생의 기록이 한꺼번에 만들어지므로 저장 전에 확인을 받는다.
      if (target.students.length > 1) {
        setPendingBulk({ students: target.students, type, amount, reason })
        return
      }

      const studentId = target.students[0].id
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

  const cancelBulk = useCallback(() => setPendingBulk(null), [])

  /** 확인 창의 '지급' — 여기서만 실제 저장이 일어난다. */
  const confirmBulk = useCallback(async () => {
    if (!pendingBulk || !addBulkPoints) return
    const { students, type, amount, reason } = pendingBulk

    const result = await addBulkPoints({ studentIds: students.map((student) => student.id), type, amount, reason })
    if (result.error) return

    setPendingBulk(null)
    setTarget(null)

    // 25~30명이 동시에 튀어오르면 화면이 정신없고 느려진다. 인원이 많으면 개별
    // 식물 애니메이션은 생략하고 점수/단계 변화만 조용히 반영한다.
    if (students.length <= BULK_PULSE_LIMIT) {
      for (const student of students) trigger(student.id, type)
    }

    const count = result.count ?? students.length
    setFeedback({
      id: Date.now(),
      tone: type === 'merit' ? 'grow' : 'adjust',
      message:
        type === 'merit'
          ? `${count}명에게 상점 +${amount}점을 지급했습니다.`
          : `${count}명에게 벌점 -${amount}점을 적용했습니다.`,
    })
    onBulkSaved?.(count)
  }, [pendingBulk, addBulkPoints, trigger, onBulkSaved])

  const dismissFeedback = useCallback(() => setFeedback(null), [])

  const notify = useCallback((message: string, tone: GrowthFeedback['tone'] = 'grow') => {
    setFeedback({ id: Date.now(), tone, message })
  }, [])

  return {
    target,
    open,
    openBulk,
    close,
    submit,
    pendingBulk,
    confirmBulk,
    cancelBulk,
    feedback,
    notify,
    dismissFeedback,
  }
}
