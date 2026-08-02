import { useEffect, useRef, useState, type FormEvent } from 'react'
import { fieldClass, labelClass, primaryButtonClass, secondaryButtonClass } from '../../lib/ui/classNames'

export type StudentQuickFormValues = {
  number: number
  name: string
  gender: string
}

type StudentQuickFormModalProps = {
  /** Prefilled 출석번호 (next available number). */
  suggestedNumber: number
  onCancel: () => void
  onSubmit: (values: StudentQuickFormValues) => Promise<{ error?: string }>
}

/** Small "학생 추가" dialog for quickly adding a student (출석번호/이름/성별 only).
 *  Editing an existing student's full info uses StudentForm inside a Modal instead. */
export function StudentQuickFormModal({ suggestedNumber, onCancel, onSubmit }: StudentQuickFormModalProps) {
  const [number, setNumber] = useState(String(suggestedNumber))
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    firstFieldRef.current?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (!submitting) onCancel()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const items = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('input, select, button:not([disabled])'),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCancel])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !number.trim()) {
      setError('출석번호와 이름은 필수입니다.')
      return
    }
    setError(null)
    setSubmitting(true)
    const result = await onSubmit({ number: Number(number), name: name.trim(), gender })
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-quick-form-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel()
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm rounded-[18px] bg-white p-5"
        style={{ boxShadow: '0 20px 50px -12px rgba(15, 23, 42, 0.18)' }}
      >
        <h2 id="student-quick-form-title" className="text-base font-bold text-gray-900">
          학생 추가
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label className={labelClass} htmlFor="quick-student-number">
            출석번호
            <input
              id="quick-student-number"
              ref={firstFieldRef}
              type="number"
              required
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className={labelClass} htmlFor="quick-student-name">
            이름
            <input
              id="quick-student-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className={labelClass} htmlFor="quick-student-gender">
            성별
            <select
              id="quick-student-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={fieldClass}
            >
              <option value="">선택하지 않음</option>
              <option value="남">남</option>
              <option value="여">여</option>
            </select>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onCancel} disabled={submitting} className={secondaryButtonClass}>
              취소
            </button>
            <button type="submit" disabled={submitting} className={primaryButtonClass}>
              {submitting ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
