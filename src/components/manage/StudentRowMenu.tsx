import { useEffect, useRef, useState } from 'react'

type StudentRowMenuProps = {
  studentName: string
  onViewDetails: () => void
  onEdit: () => void
  onDelete: () => void
}

export function StudentRowMenu({ studentName, onViewDetails, onEdit, onDelete }: StudentRowMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label={`${studentName} 학생 관리 메뉴`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="4" r="1.6" fill="currentColor" />
          <circle cx="10" cy="10" r="1.6" fill="currentColor" />
          <circle cx="10" cy="16" r="1.6" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={`${studentName} 학생 관리 메뉴`}
          className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 text-sm"
          style={{ boxShadow: '0 12px 30px -8px rgba(15, 23, 42, 0.18)' }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onViewDetails()
            }}
            className="block w-full px-3 py-2 text-left text-gray-700 transition-colors hover:bg-gray-50"
          >
            상세정보 보기
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
            className="block w-full px-3 py-2 text-left text-gray-700 transition-colors hover:bg-gray-50"
          >
            학생 정보 수정
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
            className="block w-full px-3 py-2 text-left text-red-600 transition-colors hover:bg-red-50"
          >
            학생 삭제
          </button>
        </div>
      )}
    </div>
  )
}
