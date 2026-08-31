import type { ReactNode } from 'react'

/**
 * 성장정원 툴바의 분절형 토글(정렬 기준, 보기 모드)이 공유하는 껍데기.
 * 같은 줄에 두 개가 나란히 놓이므로 한 곳에서 스타일을 관리한다.
 */
export function SegmentedGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex h-9 shrink-0 overflow-hidden rounded-lg border border-gray-300 bg-white text-sm"
    >
      {children}
    </div>
  )
}

export function SegmentedButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 px-2 sm:px-3 font-medium transition-colors ${
        active ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}
