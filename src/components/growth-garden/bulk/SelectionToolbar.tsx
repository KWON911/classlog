import { Users } from 'lucide-react'

type SelectionToolbarProps = {
  classSize: number
  onEnter: () => void
}

/**
 * 선택 모드 진입 버튼.
 *
 * 평소 화면에는 이 버튼 하나만 둔다. 선택 모드에 들어가면 이 버튼 대신
 * SelectionActionBar가 카드 위에 붙어 조작을 전부 맡는다.
 */
export function SelectionToolbar({ classSize, onEnter }: SelectionToolbarProps) {
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
