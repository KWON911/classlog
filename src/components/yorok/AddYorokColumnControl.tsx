import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { YorokColumnType } from '../../lib/types'
import { fieldClass, primaryButtonClass, secondaryButtonClass } from '../../lib/ui/classNames'

type AddYorokColumnControlProps = {
  onAdd: (label: string, type: YorokColumnType) => Promise<{ error?: string }>
}

export function AddYorokColumnControl({ onAdd }: AddYorokColumnControlProps) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [type, setType] = useState<YorokColumnType>('text')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setOpen(false)
    setLabel('')
    setType('text')
    setError(null)
  }

  const handleSubmit = async () => {
    const trimmed = label.trim()
    if (!trimmed) {
      setError('컬럼 이름을 입력해 주세요.')
      return
    }
    setSubmitting(true)
    const result = await onAdd(trimmed, type)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    reset()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <Plus size={16} /> 컬럼 추가
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="컬럼 이름 (예: 진로희망)"
        className={fieldClass}
        autoFocus
      />
      <div className="flex items-center gap-3 text-sm text-gray-700">
        <label className="flex items-center gap-1">
          <input type="radio" checked={type === 'text'} onChange={() => setType('text')} /> 텍스트형
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={type === 'checkbox'} onChange={() => setType('checkbox')} /> 체크리스트형
        </label>
      </div>
      <button type="button" onClick={handleSubmit} disabled={submitting} className={primaryButtonClass}>
        {submitting ? '추가 중...' : '추가'}
      </button>
      <button type="button" onClick={reset} disabled={submitting} className={secondaryButtonClass}>
        취소
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  )
}
