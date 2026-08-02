import { useState, type FormEvent } from 'react'
import type { RecordCategory } from '../lib/types'
import { fieldClass, labelClass, primaryButtonClass, secondaryButtonClass, textareaClass } from '../lib/ui/classNames'

const CATEGORIES: RecordCategory[] = ['생활지도', '학습', '진로', '학부모상담', '기타']

export type RecordFormValues = {
  category: RecordCategory
  content: string
  record_date: string
}

type RecordFormProps = {
  initialValues?: Partial<RecordFormValues>
  onSubmit: (values: RecordFormValues) => Promise<void> | void
  onCancel: () => void
  submitLabel: string
}

export function RecordForm({ initialValues, onSubmit, onCancel, submitLabel }: RecordFormProps) {
  const [category, setCategory] = useState<RecordCategory>(initialValues?.category ?? '생활지도')
  const [content, setContent] = useState(initialValues?.content ?? '')
  const [recordDate, setRecordDate] = useState(
    initialValues?.record_date ?? new Date().toLocaleDateString('sv-SE'),
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      setError('내용을 입력하세요.')
      return
    }
    setError(null)
    setSubmitting(true)
    await onSubmit({ category, content: content.trim(), record_date: recordDate })
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          날짜
          <input
            type="date"
            required
            value={recordDate}
            onChange={(e) => setRecordDate(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          카테고리
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as RecordCategory)}
            className={fieldClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={labelClass}>
        내용
        <textarea
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className={textareaClass}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          취소
        </button>
      </div>
    </form>
  )
}
