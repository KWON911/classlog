import { dayName, yyyymmdd } from './date-utils'
import type { AttendanceEntryWithStudent, AttendanceStatus, WeeklyAttendanceDay } from '../types'

const STATUS_ORDER: AttendanceStatus[] = ['결석', '지각', '조퇴', '결과']

export function groupAttendanceByDate(
  days: Date[],
  entries: AttendanceEntryWithStudent[],
): WeeklyAttendanceDay[] {
  return days.map((d) => {
    const ds = yyyymmdd(d)
    const dayEntries = entries
      .filter((e) => e.date.replace(/-/g, '') === ds && e.students !== null)
      .map((e) => ({
        student_id: e.student_id,
        number: e.students!.number,
        name: e.students!.name,
        status: e.status,
      }))
      .sort((a, b) => {
        const statusDiff = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
        if (statusDiff !== 0) return statusDiff
        return a.number - b.number
      })
    return { date: ds, dayLabel: dayName(d), entries: dayEntries }
  })
}
