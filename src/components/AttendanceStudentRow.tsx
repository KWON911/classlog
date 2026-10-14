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
  'h-10 rounded-lg border border-gray-300 bg-white px-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100'

/** 연한 강조만 — 색상만으로 상태를 구분하지 않도록 select의 상태 텍스트와 함께 사용한다. */
const STATUS_ACCENT_CLASS: Record<AttendanceStatus, string> = {
  결석: 'border-l-red-300 bg-red-50/40',
  지각: 'border-l-amber-300 bg-amber-50/40',
  조퇴: 'border-l-purple-300 bg-purple-50/40',
  결과: 'border-l-teal-300 bg-teal-50/40',
}

type AttendanceStudentRowProps = {
  studentId: string
  number: number
  name: string
  draft: AttendanceDraftEntry
  onChange: (patch: Partial<AttendanceDraftEntry>) => void
  highlighted?: boolean
}

export function AttendanceStudentRow({ studentId, number, name, draft, onChange, highlighted }: AttendanceStudentRowProps) {
  const isPresent = draft.status === '출석'

  return (
    <div
      id={`student-row-${studentId}`}
      className={`${isPresent ? 'border-b border-gray-100 bg-white last:border-b-0' : `rounded-lg border border-gray-200 border-l-4 ${STATUS_ACCENT_CLASS[draft.status as AttendanceStatus]}`} px-3 py-2 ${highlighted ? 'relative z-[1] ring-2 ring-brand-500' : ''}`}
    >
      <div className={`grid items-center gap-2 ${isPresent ? 'grid-cols-[40px_minmax(0,1fr)_96px]' : 'grid-cols-[40px_minmax(70px,1fr)_96px] @xl:grid-cols-[40px_minmax(90px,1fr)_96px_112px_minmax(150px,2fr)]'}`}>
        <span className="text-sm tabular-nums text-gray-600">{number}번</span>
        <span className="min-w-0 truncate text-sm font-semibold text-gray-900">{name}</span>
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
        {!isPresent && (
          <>
            <select
              value={draft.reasonCategory}
              onChange={(e) => onChange({ reasonCategory: e.target.value as AttendanceReasonCategory })}
              className={`${fieldClass} col-span-1 @xl:col-span-1`}
              aria-label={`${name} 출결 구분`}
            >
              {REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
            </select>
            <input
              type="text"
              placeholder="사유 또는 메모"
              value={draft.note}
              onChange={(e) => onChange({ note: e.target.value })}
              className={`${fieldClass} col-span-2 min-w-0 @xl:col-span-1`}
              aria-label={`${name} 사유 또는 메모`}
            />
          </>
        )}
      </div>
    </div>
  )
}
