import type { AttendanceStatus } from '../types'

/**
 * Single source of truth for the color tied to each attendance status —
 * used by both AttendanceCalendar's day-cell tags and MonthlyAttendance
 * Summary's detail-record badges, so the two screens can never drift into
 * showing a different "결석 color" from each other. Shape (tag vs pill)
 * stays with each consumer; only the bg/text color pairing lives here.
 */
export const ATTENDANCE_STATUS_COLOR_CLASS: Record<AttendanceStatus, string> = {
  결석: 'bg-red-50 text-red-700',
  지각: 'bg-amber-50 text-amber-700',
  조퇴: 'bg-purple-50 text-purple-700',
  결과: 'bg-teal-50 text-teal-700',
}

/** MonthlyAttendanceSummary의 0건 상태 뱃지용 — 실제 값이 있는 상태 색 옆에서 눈에 띄지 않도록 무채색으로 낮춤. */
export const ATTENDANCE_ZERO_COUNT_BADGE_CLASS = 'bg-gray-50 text-gray-300'
