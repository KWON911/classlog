import { Check, Minus, Users, X } from 'lucide-react'
import type { SelectionState } from '../../../lib/growth-garden/bulkGrowth'

type SelectionToolbarProps = {
  active: boolean
  classSize: number
  selectedCount: number
  state: SelectionState
  onEnter: () => void
  onSelectAll: () => void
  onClear: () => void
  onExit: () => void
}

/**
 * 선택 모드 진입/조작 툴바.
 *
 * 평소에는 [학생 선택] 버튼 하나만 두어 화면을 늘리지 않고, 선택 모드일 때만
 * 전체 선택·해제·인원·종료가 같은 자리에 펼쳐진다.
 */
export function SelectionToolbar({
  active,
  classSize,
  selectedCount,
  state,
  onEnter,
  onSelectAll,
  onClear,
  onExit,
}: SelectionToolbarProps) {
  if (!active) {
    return (
      <button
        type="button"
        onClick={onEnter}
        disabled={classSize === 0}
        title={classSize === 0 ? '현재 학급에 등록된 학생이 없습니다.' : undefined}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Users size={14} aria-hidden="true" />
        학생 선택
      </button>
    )
  }

  return (
    <div className="inline-flex h-9 items-center gap-2 rounded-lg border border-brand-200 bg-brand-50/70 px-2 text-sm">
      {/* 전체 선택은 3상태(선택 없음 / 일부 / 전체)를 아이콘과 글자로 함께 보여준다. */}
      <button
        type="button"
        role="checkbox"
        aria-checked={state === 'all' ? 'true' : state === 'partial' ? 'mixed' : 'false'}
        onClick={state === 'all' ? onClear : onSelectAll}
        className="inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 font-medium text-brand-800 transition-colors hover:bg-brand-100"
      >
        <span
          aria-hidden="true"
          className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
            state === 'none' ? 'border-gray-400 bg-white text-transparent' : 'border-brand-600 bg-brand-600 text-white'
          }`}
        >
          {state === 'partial' ? <Minus size={12} strokeWidth={3} /> : <Check size={12} strokeWidth={3} />}
        </span>
        전체 선택
      </button>

      <span className="tabular-nums text-brand-900" aria-live="polite">
        {selectedCount === 0 ? '선택된 학생 없음' : `${classSize}명 중 ${selectedCount}명 선택`}
      </span>

      <button
        type="button"
        onClick={onClear}
        disabled={selectedCount === 0}
        className="h-7 rounded-md px-2 font-medium text-gray-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        선택 해제
      </button>

      <button
        type="button"
        onClick={onExit}
        className="inline-flex h-7 items-center gap-1 rounded-md border border-gray-300 bg-white px-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <X size={13} aria-hidden="true" />
        선택 모드 종료
      </button>
    </div>
  )
}
