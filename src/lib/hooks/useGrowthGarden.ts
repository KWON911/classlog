import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { growthGardenService } from '../growth-garden/services'
import { DEFAULT_DEMERIT_REASON, DEFAULT_MERIT_REASON } from '../growth-garden/constants'
import { EMPTY_SUMMARY, entriesForStudent, summarizeByStudent, type GardenSummary } from '../growth-garden/growth'
import type { GrowthPointEntry, GrowthPointType } from '../types'

/**
 * 성장정원 상태 훅.
 *
 * 다른 훅들과 달리 supabase를 직접 부르지 않고 `growthGardenService`만 호출한다 —
 * mock ↔ Supabase 교체가 이 훅 바깥(services/index.ts)에서 끝나도록 하기 위함.
 * 낙관적 갱신은 하지 않는다: 기록 성공 응답을 받은 뒤 state를 갱신해야
 * 카드의 성장/후퇴 애니메이션이 "저장된 사실"과 어긋나지 않는다.
 */
export function useGrowthGarden() {
  const [entries, setEntries] = useState<GrowthPointEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 저장 중인 학생 id — 같은 학생에게 연타가 들어와도 요청은 한 번만 나간다.
  // ref와 state를 함께 두는 이유: ref는 렌더 사이 경합 없이 즉시 막기 위해,
  // state는 버튼 disabled를 다시 그리기 위해 필요하다.
  const pendingRef = useRef<Set<string>>(new Set())
  const [pendingIds, setPendingIds] = useState<string[]>([])

  const syncPending = useCallback(() => {
    setPendingIds([...pendingRef.current])
  }, [])

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await growthGardenService.listEntries()
    if (error) setError(error)
    else setEntries(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const addPoint = useCallback(
    async (studentId: string, type: GrowthPointType, amount: number, reason: string) => {
      if (pendingRef.current.has(studentId)) {
        return { error: '이전 기록을 저장하는 중입니다.' }
      }
      pendingRef.current.add(studentId)
      syncPending()

      try {
        const { data, error } = await growthGardenService.addEntry({
          student_id: studentId,
          type,
          amount,
          reason: reason.trim() || (type === 'merit' ? DEFAULT_MERIT_REASON : DEFAULT_DEMERIT_REASON),
        })
        if (error || !data) {
          const message = error ?? '기록에 실패했습니다.'
          setError(message)
          return { error: message }
        }
        setEntries((previous) => [...previous, data])
        return { data }
      } finally {
        pendingRef.current.delete(studentId)
        syncPending()
      }
    },
    [syncPending],
  )

  const deleteEntry = useCallback(async (id: string) => {
    const { error } = await growthGardenService.deleteEntry(id)
    if (error) {
      setError(error)
      return { error }
    }
    setEntries((previous) => previous.filter((entry) => entry.id !== id))
    return {}
  }, [])

  const clearStudent = useCallback(async (studentId: string) => {
    const { error } = await growthGardenService.clearStudent(studentId)
    if (error) {
      setError(error)
      return { error }
    }
    setEntries((previous) => previous.filter((entry) => entry.student_id !== studentId))
    return {}
  }, [])

  /** 학급 전체 기록 삭제 — 학기 초 초기화. 되돌릴 수 없다. */
  const clearClass = useCallback(async () => {
    const { error } = await growthGardenService.clearClass()
    if (error) {
      setError(error)
      return { error }
    }
    setEntries([])
    return {}
  }, [])

  const summaries = useMemo(() => summarizeByStudent(entries), [entries])

  const summaryFor = useCallback(
    (studentId: string): GardenSummary => summaries.get(studentId) ?? { studentId, ...EMPTY_SUMMARY },
    [summaries],
  )

  const historyFor = useCallback((studentId: string) => entriesForStudent(entries, studentId), [entries])

  const isSaving = useCallback((studentId: string) => pendingIds.includes(studentId), [pendingIds])

  return {
    entries,
    loading,
    error,
    summaries,
    summaryFor,
    historyFor,
    isSaving,
    addPoint,
    deleteEntry,
    clearStudent,
    clearClass,
    refetch: fetchEntries,
  }
}
