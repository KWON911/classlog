import { Minus, Plus } from 'lucide-react'
import { summarizeTargetNames } from '../../../lib/growth-garden/bulkGrowth'
import type { GrowthPointType, Student } from '../../../lib/types'

type BulkActionBarProps = {
  students: Student[]
  classSize: number
  saving: boolean
  onRequest: (type: GrowthPointType) => void
  onClear: () => void
}

/**
 * 선택된 학생이 한 명 이상일 때 화면 아래에 붙는 일괄 작업 바.
 *
 * sticky(fixed 아님)라 목록 흐름 안에 있으면서도 스크롤 중에 계속 손이 닿는다.
 * 화면을 가리는 면적을 줄이려고 한 줄 높이로 두고, 작은 화면에서는 대상 이름
 * 요약을 접는다(인원 수와 두 버튼은 항상 남는다).
 */
export function BulkActionBar({ students, classSize, saving, onRequest, onClear }: BulkActionBarProps) {
  const count = students.length
  const isWholeClass = count === classSize

  return (
    <div className="sticky bottom-0 z-20 -mx-1 mt-3 px-1 pb-1">
      <div className="flex items-center gap-2 rounded-[14px] border border-brand-200 bg-white/95 px-3 py-2 shadow-[0_-2px_16px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">
            {count}명 선택됨
            {isWholeClass && <span className="ml-1 text-xs font-medium text-brand-700">· 학급 전체</span>}
          </p>
          <p className="hidden truncate text-xs text-gray-500 sm:block">
            {summarizeTargetNames(students.map((student) => student.name))}
          </p>
        </div>

        <button
          type="button"
          onClick={onClear}
          disabled={saving}
          className="hidden h-11 shrink-0 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:inline-flex sm:items-center"
        >
          선택 해제
        </button>
        <button
          type="button"
          onClick={() => onRequest('demerit')}
          disabled={saving}
          aria-label={`선택한 ${count}명 벌점 기록하기`}
          className="inline-flex h-11 shrink-0 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3.5 text-sm font-semibold text-rose-600 transition-[transform,background-color] duration-150 hover:bg-rose-100 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus size={16} aria-hidden="true" />
          벌점
        </button>
        <button
          type="button"
          onClick={() => onRequest('merit')}
          disabled={saving}
          aria-label={`선택한 ${count}명 상점 기록하기`}
          className="inline-flex h-11 shrink-0 items-center gap-1 rounded-lg bg-brand-600 px-3.5 text-sm font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-700 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={16} aria-hidden="true" />
          상점
        </button>
      </div>
    </div>
  )
}
