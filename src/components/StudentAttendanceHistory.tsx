import type { AttendanceEntry, AttendanceStatus, Student } from '../lib/types'
import type { AttendanceSummary } from '../lib/hooks/useAttendanceSummary'
import { AttendanceBadgeGroup } from './AttendanceBadgeGroup'
import { ATTENDANCE_STATUS_COLOR_CLASS } from '../lib/utils/attendanceStatusColors'

type Props = {
  student: Student | undefined
  status: AttendanceStatus | undefined
  entries: AttendanceEntry[]
  summary: AttendanceSummary
  loading: boolean
  error: string | null
}

export function StudentAttendanceHistory({ student, status, entries, summary, loading, error }: Props) {
  if (!student) {
    return (
      <section className="rounded-[14px] border border-gray-200 bg-white p-5 text-center shadow-sm sm:p-6">
        <p className="text-sm text-gray-500">학생을 선택해 출결 이력을 확인하세요.</p>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <h2 className="sr-only">{student.name} · {status ? `${status} 이력` : '출결 이력'}</h2>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
            {student.number}
          </span>
          <span className="text-sm font-semibold text-gray-900">{student.name}</span>
        </div>
        <AttendanceBadgeGroup counts={summary} />
      </div>

      <div className="border-t border-brand-100 px-4 pb-3 pt-1">
        {loading ? (
          <p className="py-8 text-center text-sm text-gray-500">불러오는 중...</p>
        ) : error ? (
          <p className="my-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">등록된 출결 이력이 없습니다.</p>
        ) : (
          <ul>
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center gap-2 border-t border-brand-100 py-2 text-sm first:border-t-0">
              <span className="w-20 shrink-0 text-gray-500">{entry.date.slice(5).replace('-', '/')}</span>
              <span className={`inline-flex h-[22px] items-center justify-center rounded-full px-2 text-[11px] font-semibold ${ATTENDANCE_STATUS_COLOR_CLASS[entry.status]}`}>
                {entry.status}
              </span>
              <span className="text-gray-700">{entry.reason_category}</span>
              {entry.note && <span className="text-gray-600">· {entry.note}</span>}
            </li>
          ))}
          </ul>
        )}
      </div>
    </section>
  )
}
