import { useEffect, useRef, type ReactNode } from 'react'

type ModalProps = {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  /** Overrides the dialog box's max-width class (defaults to 'max-w-3xl'). */
  maxWidthClassName?: string
}

export function Modal({ title, description, onClose, children, maxWidthClassName = 'max-w-3xl' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  // Read via ref inside the mount-only effect below so a caller passing a
  // fresh inline `onClose` on every render (the common case) doesn't churn
  // that effect — it previously re-ran on every keystroke of any field that
  // lives in the caller's own state, stealing focus back into the dialog
  // after every character and making typing feel broken.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLElement>('input, select, textarea, button:not([disabled])')?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const items = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('input, select, textarea, button:not([disabled]), a[href]'),
      )
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
  }, [])

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/30 p-3 sm:p-6 print:hidden"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className={`max-h-[calc(100vh-3rem)] w-full ${maxWidthClassName} overflow-auto rounded-[18px] bg-white`}
        style={{ boxShadow: '0 20px 50px -12px rgba(15, 23, 42, 0.18)' }}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-5 sm:p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`${title} 닫기`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  )
}
