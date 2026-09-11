import type { AttendanceStatus } from '../lib/types'
import { ATTENDANCE_STATUS_COLOR_CLASS, ATTENDANCE_ZERO_COUNT_BADGE_CLASS } from '../lib/utils/attendanceStatusColors'

const STATUSES: AttendanceStatus[] = ['결석', '지각', '조퇴', '결과']

type Counts = Record<AttendanceStatus, number>

export function AttendanceBadgeGroup({ counts }: { counts: Counts }) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {STATUSES.map((status) => {
        const colorClass = counts[status] > 0 ? ATTENDANCE_STATUS_COLOR_CLASS[status] : ATTENDANCE_ZERO_COUNT_BADGE_CLASS
        return (
          <span
            key={status}
            aria-label={`${status} ${counts[status]}건`}
            className={`inline-flex h-6 items-center justify-center whitespace-nowrap rounded-full px-2.5 text-xs font-semibold ${colorClass}`}
          >
            {status} {counts[status]}
          </span>
        )
      })}
    </div>
  )
}
