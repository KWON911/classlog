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
      className={`rounded-[10px] border p-3 ${isPresent ? 'border-gray-200 bg-white' : 'border-blue-100 bg-blue-50/40'}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-14 shrink-0 text-sm text-gray-500">{number}번</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">{name}</span>
        <select
          value={draft.status}
          onChange={(e) => onChange({ status: e.target.value as DisplayStatus })}
          className={`${fieldClass} w-20`}
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
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={draft.reasonCategory}
            onChange={(e) => onChange({ reasonCategory: e.target.value as AttendanceReasonCategory })}
            className={`${fieldClass} w-24`}
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
            className={`${fieldClass} min-w-0 flex-1`}
            aria-label={`${name} 사유 또는 메모`}
          />
        </div>
      )}
    </div>
  )
}
