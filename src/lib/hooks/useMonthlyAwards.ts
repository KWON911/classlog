import { useCallback, useEffect, useState } from 'react'
import { monthlyAwardService } from '../growth-garden/services/monthlyAwardService'
import type { MonthlyAwardUpdate, NewMonthlyAward } from '../growth-garden/services/types'
import type { MonthlyAward } from '../types'
import type { YearMonth } from '../growth-garden/monthlyReport'

/**
 * 선택한 달의 월간 성장상.
 *
 * 상벌점과 완전히 분리돼 있다 — 수상/수정/취소 어느 것도 학생의 성장 포인트나
 * 상벌점 기록을 바꾸지 않는다. 지난달 수상 기록도 그대로 남는다.
 */
export function useMonthlyAwards({ year, month }: YearMonth) {
  const [awards, setAwards] = useState<MonthlyAward[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAwards = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await monthlyAwardService.listAwards(year, month)
    if (error) setError(error)
    else setAwards(data ?? [])
    setLoading(false)
  }, [year, month])

  useEffect(() => {
    fetchAwards()
  }, [fetchAwards])

  const createAward = useCallback(async (input: NewMonthlyAward) => {
    setSaving(true)
    const { data, error } = await monthlyAwardService.createAward(input)
    setSaving(false)
    if (error || !data) {
      const message = error ?? '수상 기록을 저장하지 못했습니다.'
      setError(message)
      return { error: message }
    }
    setAwards((previous) => [...previous, data])
    return { data }
  }, [])

  const updateAward = useCallback(async (id: string, input: MonthlyAwardUpdate) => {
    setSaving(true)
    const { data, error } = await monthlyAwardService.updateAward(id, input)
    setSaving(false)
    if (error || !data) {
      const message = error ?? '수상 기록을 수정하지 못했습니다.'
      setError(message)
      return { error: message }
    }
    setAwards((previous) => previous.map((award) => (award.id === id ? data : award)))
    return { data }
  }, [])

  const deleteAward = useCallback(async (id: string) => {
    const { error } = await monthlyAwardService.deleteAward(id)
    if (error) {
      setError(error)
      return { error }
    }
    setAwards((previous) => previous.filter((award) => award.id !== id))
    return {}
  }, [])

  const awardsForStudent = useCallback(
    (studentId: string) => awards.filter((award) => award.student_id === studentId),
    [awards],
  )

  return { awards, awardsForStudent, loading, saving, error, createAward, updateAward, deleteAward, refetch: fetchAwards }
}
