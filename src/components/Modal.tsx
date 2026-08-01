import { useEffect, type ReactNode } from 'react'

type ModalProps = {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ title, description, onClose, children }: ModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-6 print:hidden"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="max-h-[calc(100vh-3rem)] w-full max-w-3xl overflow-auto rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="설정 창 닫기"
            className="rounded bg-gray-100 px-2 py-1 text-sm text-gray-700"
          >
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
