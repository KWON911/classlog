import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, Save } from 'lucide-react'
import { validateClassGoalMilestones } from '../../../lib/growth-garden/classGoal'
import type { NewClassGoal } from '../../../lib/growth-garden/services/types'
import type { ClassGoal, ClassGoalMilestone, DecorationType } from '../../../lib/types'
import { CLASS_GOAL_DECORATION_TYPES, classGoalDecorationLabel } from '../../../lib/growth-garden/classGoalDecorations'

function defaultMilestones(unlockedTypes: Set<DecorationType>): ClassGoalMilestone[] {
  const available = CLASS_GOAL_DECORATION_TYPES.filter((type) => !unlockedTypes.has(type))
  if (available.length < 3) return []
  return available.slice(0, 3).map((decorationType, index) => ({ point: (index + 1) * 100, decorationType }))
}

type ClassGoalEditorProps = {
  initialGoal: ClassGoal | null
  unlockedTypes: Set<DecorationType>
  onSave: (input: NewClassGoal) => Promise<{ error?: string } | void> | { error?: string } | void
  year?: number
  month?: number
  onYearMonthChange?: (year: number, month: number) => void
  saving?: boolean
}

/** 연·월별 공동 목표 편집기. 이미 해금한 장식은 새 목표에서 다시 고를 수 없다. */
export function ClassGoalEditor({ initialGoal, unlockedTypes, onSave, year, month, onYearMonthChange, saving = false }: ClassGoalEditorProps) {
  const now = new Date()
  const selectedYear = year ?? initialGoal?.year ?? now.getFullYear()
  const selectedMonth = month ?? initialGoal?.month ?? now.getMonth() + 1
  const resetKey = `${initialGoal?.id ?? 'new'}:${selectedYear}:${selectedMonth}:${[...unlockedTypes].sort().join(',')}`
  const [targetPoint, setTargetPoint] = useState(initialGoal?.target_point ?? 300)
  const [milestones, setMilestones] = useState<ClassGoalMilestone[]>(initialGoal?.milestones ?? (() => defaultMilestones(unlockedTypes)))
  const [submitError, setSubmitError] = useState<string | null>(null)
  const unusedDecorationCount = CLASS_GOAL_DECORATION_TYPES.filter((type) => !unlockedTypes.has(type)).length
  const creationError = !initialGoal && unusedDecorationCount < 3
    ? '새 공동 목표에는 사용하지 않은 장식이 3개 이상 필요합니다.'
    : null

  useEffect(() => {
    setTargetPoint(initialGoal?.target_point ?? 300)
    setMilestones(initialGoal?.milestones ?? defaultMilestones(unlockedTypes))
    setSubmitError(null)
  }, [resetKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const validationError = useMemo(() => {
    if (!Number.isInteger(targetPoint) || targetPoint <= 0) return '최종 목표 점수는 양의 정수로 입력해 주세요.'
    return validateClassGoalMilestones(milestones, targetPoint)
  }, [milestones, targetPoint])

  const duplicateError = submitError ?? creationError ?? validationError
  const nextDecoration = CLASS_GOAL_DECORATION_TYPES.find(
    (type) => !unlockedTypes.has(type) && !milestones.some((item) => item.decorationType === type),
  )

  function updateMilestone(index: number, patch: Partial<ClassGoalMilestone>) {
    setMilestones((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
    setSubmitError(null)
  }

  async function submit() {
    if (validationError) {
      setSubmitError(validationError)
      return
    }
    const result = await onSave({ year: selectedYear, month: selectedMonth, target_point: targetPoint, milestones })
    if (result?.error) setSubmitError(result.error)
  }

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-600">학급 공동 목표</h2>
        <p className="mt-1 text-sm text-gray-600">이번 달 상점을 함께 모아 정원 장식을 해금합니다. 학생별 기여도는 표시하지 않습니다.</p>
      </div>

      {onYearMonthChange && (
        <div className="mb-4 flex flex-wrap gap-2">
          <label className="text-sm text-gray-700">연도 <input aria-label="목표 연도" type="number" min={2000} max={2200} value={selectedYear} onChange={(event) => onYearMonthChange(Number(event.target.value), selectedMonth)} className="ml-1 h-9 w-20 rounded-lg border border-gray-300 px-2 text-right" /></label>
          <label className="text-sm text-gray-700">월 <select aria-label="목표 월" value={selectedMonth} onChange={(event) => onYearMonthChange(selectedYear, Number(event.target.value))} className="ml-1 h-9 rounded-lg border border-gray-300 px-2">{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}월</option>)}</select></label>
        </div>
      )}

      <label className="mb-4 flex items-center justify-between gap-3 text-sm font-medium text-gray-800">최종 목표 점수
        <span className="flex items-center gap-1"><input aria-label="최종 목표 점수" type="number" min={1} inputMode="numeric" value={Number.isFinite(targetPoint) ? targetPoint : ''} onChange={(event) => { setTargetPoint(Number(event.target.value)); setSubmitError(null) }} className="h-9 w-24 rounded-lg border border-gray-300 px-2 text-right tabular-nums" />점</span>
      </label>

      <ol className="space-y-2">
        {milestones.map((milestone, index) => (
          <li key={index} className="flex flex-wrap items-center gap-2 rounded-xl bg-brand-50/50 p-2">
            <span className="w-12 text-sm font-semibold text-brand-700">{index + 1}단계</span>
            <input aria-label={`${index + 1}단계 점수`} type="number" min={1} inputMode="numeric" disabled={Boolean(initialGoal && unlockedTypes.has(milestone.decorationType))} value={Number.isFinite(milestone.point) ? milestone.point : ''} onChange={(event) => updateMilestone(index, { point: Number(event.target.value) })} className="h-9 w-20 rounded-lg border border-gray-300 bg-white px-2 text-right tabular-nums disabled:cursor-not-allowed disabled:bg-gray-100" />
            <select aria-label={`${index + 1}단계 장식`} value={milestone.decorationType} disabled={Boolean(initialGoal && unlockedTypes.has(milestone.decorationType))} onChange={(event) => updateMilestone(index, { decorationType: event.target.value as DecorationType })} className="h-9 min-w-[130px] flex-1 rounded-lg border border-gray-300 bg-white px-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100">
              {CLASS_GOAL_DECORATION_TYPES.map((type) => {
                const legacySelection = initialGoal?.milestones.some((item) => item.decorationType === type) ?? false
                const disabled = unlockedTypes.has(type) && !legacySelection
                return <option key={type} value={type} disabled={disabled}>{classGoalDecorationLabel(type)}{disabled ? ' (이미 해금됨)' : ''}</option>
              })}
            </select>
            {initialGoal && unlockedTypes.has(milestone.decorationType) && <span className="text-xs font-semibold text-brand-700">해금 완료</span>}
            <button type="button" aria-label={`${index + 1}단계 삭제`} disabled={milestones.length <= 3 || Boolean(initialGoal && unlockedTypes.has(milestone.decorationType))} onClick={() => setMilestones((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"><Minus size={16} aria-hidden="true" /></button>
          </li>
        ))}
      </ol>

      {duplicateError && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{duplicateError}</p>}

      <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4">
        <button type="button" onClick={() => nextDecoration && setMilestones((current) => [...current, { point: (current[current.length - 1]?.point ?? 0) + 100, decorationType: nextDecoration }])} disabled={milestones.length >= 5 || !nextDecoration || Boolean(creationError)} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"><Plus size={15} aria-hidden="true" />단계 추가</button>
        <button type="button" onClick={() => void submit()} disabled={saving || Boolean(creationError)} className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"><Save size={15} aria-hidden="true" />{saving ? '저장하는 중...' : '저장'}</button>
      </div>
    </div>
  )
}
