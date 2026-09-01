import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { growthGardenService } from '../growth-garden/services'
import { DEFAULT_DEMERIT_REASON, DEFAULT_MERIT_REASON } from '../growth-garden/constants'
import { EMPTY_SUMMARY, entriesForStudent, summarizeByStudent, type GardenSummary } from '../growth-garden/growth'
import { backfillPlantCycles, plantCycleForScore } from '../growth-garden/plantCycle'
import { buildBulkEntries, createBatchId, type BulkPointInput } from '../growth-garden/bulkGrowth'
import { useGrowthSettings } from '../growth-garden/growthSettingsContext'
import type { GrowthPointEntry, GrowthPointType, PlantCycle } from '../types'

/**
 * 성장정원 상태 훅.
 *
 * 다른 훅들과 달리 supabase를 직접 부르지 않고 `growthGardenService`만 호출한다 —
 * mock ↔ Supabase 교체가 이 훅 바깥(services/index.ts)에서 끝나도록 하기 위함.
 * 낙관적 갱신은 하지 않는다: 기록 성공 응답을 받은 뒤 state를 갱신해야
 * 카드의 성장/후퇴 애니메이션이 "저장된 사실"과 어긋나지 않는다.
 */
export function useGrowthGarden() {
  // 단계 계산은 교사가 설정한 기준을 따른다(화면마다 기준이 갈리지 않도록 한 곳에서).
  const { personalStages, loading: settingsLoading } = useGrowthSettings()
  const [entries, setEntries] = useState<GrowthPointEntry[]>([])
  const [plantCycles, setPlantCycles] = useState<PlantCycle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 저장 중인 학생 id — 같은 학생에게 연타가 들어와도 요청은 한 번만 나간다.
  // ref와 state를 함께 두는 이유: ref는 렌더 사이 경합 없이 즉시 막기 위해,
  // state는 버튼 disabled를 다시 그리기 위해 필요하다.
  const pendingRef = useRef<Set<string>>(new Set())
  const [pendingIds, setPendingIds] = useState<string[]>([])

  // 일괄 저장도 같은 이유로 ref(즉시 차단) + state(버튼 disabled)를 함께 쓴다.
  const bulkPendingRef = useRef(false)
  const [bulkSaving, setBulkSaving] = useState(false)

  const syncPending = useCallback(() => {
    setPendingIds([...pendingRef.current])
  }, [])

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [entriesResult, cyclesResult] = await Promise.all([growthGardenService.listEntries(), growthGardenService.listPlantCycles()])
    if (entriesResult.error || cyclesResult.error) setError(entriesResult.error ?? cyclesResult.error ?? '정원을 불러오지 못했습니다.')
    else { setEntries(entriesResult.data ?? []); setPlantCycles(cyclesResult.data ?? []) }
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

  /**
   * 선택 학생 일괄 기록.
   *
   * 개별 기록과 같은 규칙을 쓴다 — 사유 기본값 처리도 addPoint와 동일하고, 점수는
   * 저장된 값이 아니라 이 기록들에서 다시 계산되므로 일괄 전용 점수 로직이 없다.
   * 요청은 학생 수만큼이 아니라 한 번만 나간다.
   */
  const addBulkPoints = useCallback(
    async ({ studentIds, type, amount, reason }: BulkPointInput) => {
      // 빈 배열로 요청이 나가면 안 된다(학생이 없는 학급, 선택 0명).
      const targets = [...new Set(studentIds)]
      if (targets.length === 0) return { error: '선택된 학생이 없습니다.' }
      // 진행 중인 일괄 작업이 있으면 같은 묶음이 두 번 만들어지지 않게 막는다.
      if (bulkPendingRef.current) return { error: '이전 일괄 기록을 저장하는 중입니다.' }

      bulkPendingRef.current = true
      setBulkSaving(true)
      try {
        const batchId = createBatchId()
        const rows = buildBulkEntries(
          {
            studentIds: targets,
            type,
            amount,
            reason: reason.trim() || (type === 'merit' ? DEFAULT_MERIT_REASON : DEFAULT_DEMERIT_REASON),
          },
          batchId,
        )

        const { data, error } = await growthGardenService.addEntries(rows)
        if (error || !data) {
          const message = error ?? '일괄 기록에 실패했습니다.'
          setError(message)
          return { error: message }
        }
        setEntries((previous) => [...previous, ...data])
        return { data, batchId, count: data.length }
      } finally {
        bulkPendingRef.current = false
        setBulkSaving(false)
      }
    },
    [],
  )

  /** 일괄 지급 취소 — 그 묶음의 기록만 지운다. 점수는 남은 기록으로 다시 계산된다. */
  const deleteBatch = useCallback(async (batchId: string) => {
    const { error } = await growthGardenService.deleteBatch(batchId)
    if (error) {
      setError(error)
      return { error }
    }
    setEntries((previous) => previous.filter((entry) => entry.batch_id !== batchId))
    return {}
  }, [])

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

  const summaries = useMemo(() => summarizeByStudent(entries, personalStages), [entries, personalStages])

  useEffect(() => {
    const ids = [...new Set(entries.map((entry) => entry.student_id))]
    const missing = ids.flatMap((studentId) => backfillPlantCycles(studentId, entries, plantCycles, personalStages))
    if (missing.length === 0) return
    growthGardenService.upsertPlantCycles(missing).then(({ data }) => {
      if (data?.length) setPlantCycles((previous) => [...previous, ...data])
    })
  }, [entries, plantCycles, personalStages])

  const summaryFor = useCallback(
    (studentId: string): GardenSummary => summaries.get(studentId) ?? { studentId, ...EMPTY_SUMMARY },
    [summaries],
  )

  const historyFor = useCallback((studentId: string) => entriesForStudent(entries, studentId), [entries])
  const cycleFor = useCallback((studentId: string) => plantCycleForScore(studentId, summaryFor(studentId).score, personalStages), [personalStages, summaryFor])
  const cyclesFor = useCallback((studentId: string) => plantCycles.filter((cycle) => cycle.student_id === studentId).sort((a, b) => a.cycle_number - b.cycle_number), [plantCycles])
  const latestCompletedCycleFor = useCallback((studentId: string) => cyclesFor(studentId).at(-1) ?? null, [cyclesFor])

  const isSaving = useCallback((studentId: string) => pendingIds.includes(studentId), [pendingIds])

  return {
    entries,
    // 기준을 불러오는 동안에도 로딩으로 둔다 — 기본값으로 그렸다가 다시 그리면 식물이 깜빡인다.
    loading: loading || settingsLoading,
    error,
    summaries,
    summaryFor,
    historyFor,
    cycleFor,
    cyclesFor,
    latestCompletedCycleFor,
    isSaving,
    bulkSaving,
    addPoint,
    addBulkPoints,
    deleteBatch,
    deleteEntry,
    clearStudent,
    clearClass,
    refetch: fetchEntries,
  }
}
