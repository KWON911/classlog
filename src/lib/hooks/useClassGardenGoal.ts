import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildClassGoalProgress, classGoalScore, validateClassGoalMilestones, type ClassGoalProgress } from '../growth-garden/classGoal'
import { growthGardenService } from '../growth-garden/services'
import type { NewClassGardenUnlock, NewClassGoal } from '../growth-garden/services/types'
import { useStudents } from './useStudents'
import type { ClassGardenUnlock, ClassGoal, GrowthPointEntry } from '../types'
export { CLASS_GARDEN_GOAL_REFRESH_EVENT, dispatchClassGardenGoalRefresh } from './classGardenGoalRefresh'
import { CLASS_GARDEN_GOAL_REFRESH_EVENT } from './classGardenGoalRefresh'

function mergeUnlocks(current: ClassGardenUnlock[], added: ClassGardenUnlock[]): ClassGardenUnlock[] {
  const seen = new Set(current.map((unlock) => unlock.decoration_type))
  return [...current, ...added.filter((unlock) => !seen.has(unlock.decoration_type))]
}

/**
 * 선택한 달의 공동 목표를 현재 명단과 성장 기록으로 파생한다.
 *
 * 성장 기록 화면과 목표 패널은 독립적으로 마운트될 수 있으므로, 성공한 기록 변경은
 * refresh 이벤트로 받아 다시 조회한다. 해금 저장 실패는 이미 성공한 상벌점 기록을
 * 되돌리지 않고 여기의 오류 상태에만 남겨 다음 refresh 때 안전하게 재시도한다.
 */
export function useClassGardenGoal(year: number, month: number) {
  const { students, loading: studentsLoading } = useStudents()
  const [goal, setGoal] = useState<ClassGoal | null>(null)
  const [unlocks, setUnlocks] = useState<ClassGardenUnlock[]>([])
  const [entries, setEntries] = useState<GrowthPointEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const refreshSequence = useRef(0)

  const studentIds = useMemo(() => new Set(students.map((student) => student.id)), [students])

  const refresh = useCallback(async () => {
    if (studentsLoading) return

    const sequence = ++refreshSequence.current
    setLoading(true)
    setError(null)
    const [goalResult, unlockResult, entriesResult] = await Promise.all([
      growthGardenService.getClassGoal(year, month),
      growthGardenService.listClassGardenUnlocks(),
      growthGardenService.listEntries(),
    ])

    if (sequence !== refreshSequence.current) return
    const loadError = goalResult.error ?? unlockResult.error ?? entriesResult.error
    if (loadError) {
      setError(loadError)
      setLoading(false)
      return
    }

    const nextGoal = goalResult.data
    const nextUnlocks = unlockResult.data ?? []
    const nextEntries = entriesResult.data ?? []
    setGoal(nextGoal)
    setUnlocks(nextUnlocks)
    setEntries(nextEntries)

    if (!nextGoal) {
      setLoading(false)
      return
    }

    const score = classGoalScore(nextEntries, studentIds, { year, month })
    const progress = buildClassGoalProgress(nextGoal, score, nextUnlocks)
    const newUnlocks: NewClassGardenUnlock[] = progress.newlyReachableMilestones.map((milestone) => ({
      decoration_type: milestone.decorationType,
      year: nextGoal.year,
      month: nextGoal.month,
      milestone_point: milestone.point,
    }))
    if (newUnlocks.length === 0) {
      setLoading(false)
      return
    }

    const saved = await growthGardenService.upsertClassGardenUnlocks(newUnlocks)
    if (sequence !== refreshSequence.current) return
    if (saved.error) {
      setError(saved.error)
    } else if (saved.data?.length) {
      setUnlocks((current) => mergeUnlocks(current, saved.data ?? []))
    }
    setLoading(false)
  }, [month, studentIds, studentsLoading, year])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handleRefresh = () => { void refresh() }
    window.addEventListener(CLASS_GARDEN_GOAL_REFRESH_EVENT, handleRefresh)
    return () => window.removeEventListener(CLASS_GARDEN_GOAL_REFRESH_EVENT, handleRefresh)
  }, [refresh])

  const progress = useMemo<ClassGoalProgress | null>(() => (
    goal ? buildClassGoalProgress(goal, classGoalScore(entries, studentIds, { year, month }), unlocks) : null
  ), [entries, goal, month, studentIds, unlocks, year])

  const saveGoal = useCallback(async (input: NewClassGoal) => {
    const validationError = validateClassGoalMilestones(input.milestones, input.target_point)
    if (validationError) {
      setError(validationError)
      return { error: validationError }
    }
    const result = await growthGardenService.saveClassGoal(input)
    if (result.error || !result.data) {
      const message = result.error ?? '공동 목표를 저장하지 못했습니다.'
      setError(message)
      return { error: message }
    }
    await refresh()
    return { data: result.data }
  }, [refresh])

  return {
    goal,
    progress,
    // 기존 성장정원 소비처가 읽기 쉬운 별칭.
    goalProgress: progress,
    unlocks,
    loading: loading || studentsLoading,
    error,
    refresh,
    saveGoal,
  }
}
