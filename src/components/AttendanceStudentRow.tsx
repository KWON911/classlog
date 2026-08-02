import type { AttendanceReasonCategory, AttendanceStatus } from '../lib/types'

export type DisplayStatus = AttendanceStatus | '출석'

export type AttendanceDraftEntry = {
  status: DisplayStatus
  reasonCategory: AttendanceReasonCategory
  note: string
}

const STATUSES: DisplayStatus[] = ['출석', '결석', '지각', '조퇴', '결과']
const REASONS: AttendanceReasonCategory[] = ['질병', '미인정', '인정', '기타']

const fieldClass =
  'h-9 rounded-lg border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100'

/** 연한 강조만 — 색상만으로 상태를 구분하지 않도록 select의 상태 텍스트와 함께 사용한다. */
const STATUS_ACCENT_CLASS: Record<AttendanceStatus, string> = {
  결석: 'border-l-red-300 bg-red-50/40',
  지각: 'border-l-amber-300 bg-amber-50/40',
  조퇴: 'border-l-purple-300 bg-purple-50/40',
  결과: 'border-l-teal-300 bg-teal-50/40',
}

type AttendanceStudentRowProps = {
  number: number
  name: string
  draft: AttendanceDraftEntry
  onChange: (patch: Partial<AttendanceDraftEntry>) => void
}

export function AttendanceStudentRow({ number, name, draft, onChange }: AttendanceStudentRowProps) {
  const isPresent = draft.status === '출석'

  return (
    <div
      className={`rounded-[10px] border border-gray-200 border-l-[3px] p-2.5 ${
        isPresent ? 'bg-white' : STATUS_ACCENT_CLASS[draft.status as AttendanceStatus]
      } ${!isPresent ? 'col-span-full' : ''}`}
    >
      <div className="grid grid-cols-[36px_minmax(0,1fr)_92px] items-center gap-2">
        <span className="text-sm text-gray-500">{number}번</span>
        <span className="min-w-0 truncate text-sm font-medium text-gray-900">{name}</span>
        <select
          value={draft.status}
          onChange={(e) => onChange({ status: e.target.value as DisplayStatus })}
          className={fieldClass}
          aria-label={`${name} 출결 상태`}
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {!isPresent && (
        <div className="mt-2 grid grid-cols-[110px_minmax(0,1fr)] gap-2">
          <select
            value={draft.reasonCategory}
            onChange={(e) => onChange({ reasonCategory: e.target.value as AttendanceReasonCategory })}
            className={fieldClass}
            aria-label={`${name} 출결 구분`}
          >
            {REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="사유 또는 메모"
            value={draft.note}
            onChange={(e) => onChange({ note: e.target.value })}
            className={`${fieldClass} min-w-0`}
            aria-label={`${name} 사유 또는 메모`}
          />
        </div>
      )}
    </div>
  )
}
