import { useCallback, useEffect, useMemo, useState } from 'react'
import { rewardService } from '../growth-garden/services/rewardService'
import type { NewReward } from '../growth-garden/services/types'
import type { Reward } from '../types'
import type { YearMonth } from '../growth-garden/monthlyReport'

/**
 * 선택한 달의 보상 기록.
 *
 * 상벌점과 완전히 분리돼 있다 — 여기서 무엇을 하든 학생의 성장 포인트는 변하지 않는다.
 */
export function useRewards({ year, month }: YearMonth) {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchRewards = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await rewardService.listRewards(year, month)
    if (error) setError(error)
    else setRewards(data ?? [])
    setLoading(false)
  }, [year, month])

  useEffect(() => {
    fetchRewards()
  }, [fetchRewards])

  const createReward = useCallback(async (input: NewReward) => {
    setSaving(true)
    const { data, error } = await rewardService.createReward(input)
    setSaving(false)
    if (error || !data) {
      const message = error ?? '보상을 저장하지 못했습니다.'
      setError(message)
      return { error: message }
    }
    setRewards((previous) => [data, ...previous])
    return { data }
  }, [])

  const deleteReward = useCallback(async (id: string) => {
    const { error } = await rewardService.deleteReward(id)
    if (error) {
      setError(error)
      return { error }
    }
    setRewards((previous) => previous.filter((reward) => reward.id !== id))
    return {}
  }, [])

  const classRewards = useMemo(() => rewards.filter((reward) => reward.scope === 'class'), [rewards])

  const rewardsForStudent = useCallback(
    (studentId: string) => rewards.filter((reward) => reward.scope === 'student' && reward.student_id === studentId),
    [rewards],
  )

  return { rewards, classRewards, rewardsForStudent, loading, saving, error, createReward, deleteReward, refetch: fetchRewards }
}
