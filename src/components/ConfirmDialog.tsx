import { useEffect, useRef, type ReactNode } from 'react'

type ConfirmDialogProps = {
  title: string
  message: ReactNode
  confirmLabel?: string
  pendingLabel?: string
  cancelLabel?: string
  pending?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = '삭제',
  pendingLabel = '삭제 중...',
  cancelLabel = '취소',
  pending = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (!pending) onCancel()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
    // Only wire this up once per mount — re-running on every `pending` toggle would re-focus mid-interaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onCancel()
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm rounded-[18px] bg-white p-5"
        style={{ boxShadow: '0 20px 50px -12px rgba(15, 23, 42, 0.18)' }}
      >
        <h2 id="confirm-dialog-title" className="text-base font-bold text-gray-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="h-9 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="h-9 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
