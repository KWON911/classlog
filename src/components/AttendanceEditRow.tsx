import { useState } from 'react'
import type { AttendanceReasonCategory, AttendanceStatus } from '../lib/types'

const STATUSES: AttendanceStatus[] = ['결석', '지각', '조퇴', '결과']
const REASONS: AttendanceReasonCategory[] = ['질병', '미인정', '인정', '기타']

type AttendanceEditRowProps = {
  initialStatus?: AttendanceStatus
  initialReasonCategory?: AttendanceReasonCategory
  initialNote?: string
  onSave: (status: AttendanceStatus, reasonCategory: AttendanceReasonCategory, note: string) => void
  onClear?: () => void
  onCancel: () => void
}

export function AttendanceEditRow({
  initialStatus,
  initialReasonCategory,
  initialNote,
  onSave,
  onClear,
  onCancel,
}: AttendanceEditRowProps) {
  const [status, setStatus] = useState<AttendanceStatus>(initialStatus ?? '결석')
  const [reasonCategory, setReasonCategory] = useState<AttendanceReasonCategory>(
    initialReasonCategory ?? '질병',
  )
  const [note, setNote] = useState(initialNote ?? '')

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
        className="rounded border border-gray-300 px-2 py-1 text-sm"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select
        value={reasonCategory}
        onChange={(e) => setReasonCategory(e.target.value as AttendanceReasonCategory)}
        className="rounded border border-gray-300 px-2 py-1 text-sm"
      >
        {REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="메모"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-sm"
      />
      <button
        onClick={() => onSave(status, reasonCategory, note)}
        className="rounded bg-blue-600 px-3 py-1 text-sm text-white"
      >
        저장
      </button>
      {onClear && (
        <button onClick={onClear} className="rounded border border-gray-300 px-3 py-1 text-sm">
          출석으로 되돌리기
        </button>
      )}
      <button onClick={onCancel} className="rounded border border-gray-300 px-3 py-1 text-sm">
        취소
      </button>
    </div>
  )
}
