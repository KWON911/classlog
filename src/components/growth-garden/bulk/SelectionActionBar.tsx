import { Check, Minus, Plus, X } from 'lucide-react'
import { summarizeTargetNames, type SelectionState } from '../../../lib/growth-garden/bulkGrowth'
import type { GrowthPointType, Student } from '../../../lib/types'

type SelectionActionBarProps = {
  classSize: number
  selectedStudents: Student[]
  state: SelectionState
  saving: boolean
  onSelectAll: () => void
  onClear: () => void
  onExit: () => void
  onRequest: (type: GrowthPointType) => void
}

/**
 * 선택 모드의 조작 줄 — 전체 선택·인원·해제·상벌점·종료가 모두 여기 있다.
 *
 * 카드 격자 바로 위에 sticky로 붙는다. 선택 인원과 기록 버튼을 화면 위아래로
 * 나눠 두면 같은 작업이 양끝으로 흩어지고 인원 표시도 두 번 나온다(초기 구현이
 * 그랬다). 모바일에서는 하단에 앱 내비게이션이 고정돼 있어 아래쪽도 이미 좁다.
 */
export function SelectionActionBar({
  classSize,
  selectedStudents,
  state,
  saving,
  onSelectAll,
  onClear,
  onExit,
  onRequest,
}: SelectionActionBarProps) {
  const count = selectedStudents.length
  const isWholeClass = count > 0 && count === classSize
  const hasSelection = count > 0

  return (
    <div className="sticky top-0 z-20 -mx-1 mb-3 px-1 pt-1">
      <div className="flex flex-wrap items-center gap-2 rounded-[14px] border border-brand-200 bg-white/95 px-3 py-2 shadow-[0_2px_16px_rgba(15,23,42,0.10)] backdrop-blur">
        {/* 전체 선택은 3상태(선택 없음 / 일부 / 전체)를 아이콘과 글자로 함께 보여준다. */}
        <button
          type="button"
          role="checkbox"
          aria-checked={state === 'all' ? 'true' : state === 'partial' ? 'mixed' : 'false'}
          onClick={state === 'all' ? onClear : onSelectAll}
          className="inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-brand-800 transition-colors hover:bg-brand-50"
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

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tabular-nums text-gray-900" aria-live="polite">
            {hasSelection ? `${classSize}명 중 ${count}명 선택` : '선택된 학생 없음'}
            {isWholeClass && <span className="ml-1 text-xs font-medium text-brand-700">· 학급 전체</span>}
          </p>
          <p className="hidden truncate text-xs text-gray-500 sm:block">
            {hasSelection
              ? summarizeTargetNames(selectedStudents.map((student) => student.name))
              : '학생 카드를 눌러 선택하세요.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onClear}
          disabled={!hasSelection || saving}
          className="hidden h-11 shrink-0 items-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:inline-flex"
        >
          선택 해제
        </button>
        <button
          type="button"
          onClick={() => onRequest('demerit')}
          disabled={!hasSelection || saving}
          aria-label={`선택한 ${count}명 벌점 기록하기`}
          className="inline-flex h-11 shrink-0 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3.5 text-sm font-semibold text-rose-600 transition-[transform,background-color] duration-150 hover:bg-rose-100 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus size={16} aria-hidden="true" />
          벌점
        </button>
        <button
          type="button"
          onClick={() => onRequest('merit')}
          disabled={!hasSelection || saving}
          aria-label={`선택한 ${count}명 상점 기록하기`}
          className="inline-flex h-11 shrink-0 items-center gap-1 rounded-lg bg-brand-600 px-3.5 text-sm font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-700 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={16} aria-hidden="true" />
          상점
        </button>
        <button
          type="button"
          onClick={onExit}
          className="inline-flex h-11 shrink-0 items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <X size={14} aria-hidden="true" />
          <span className="hidden sm:inline">선택 모드 종료</span>
          <span className="sm:hidden">종료</span>
        </button>
      </div>
    </div>
  )
}
