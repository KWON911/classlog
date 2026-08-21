import { describe, expect, it } from 'vitest'
import { groupAttendanceByDate } from './weeklyAttendance'
import type { AttendanceEntryWithStudent } from '../types'

function entry(overrides: Partial<AttendanceEntryWithStudent>): AttendanceEntryWithStudent {
  return {
    id: 'x',
    student_id: 'x',
    teacher_id: 't1',
    date: '2026-08-03',
    status: '결석',
    reason_category: '기타',
    note: null,
    created_at: '2026-08-03',
    neis_entered: false,
    document_received: false,
    students: { number: 1, name: '학생' },
    ...overrides,
  }
}

describe('groupAttendanceByDate', () => {
  it('sorts same-day entries by status priority, then by student number', () => {
    // Deliberately out of both status-priority and number order, so a
    // naive (unsorted) implementation would produce a different result.
    const entries: AttendanceEntryWithStudent[] = [
      entry({ id: 'a', student_id: 's5', date: '2026-08-03', status: '조퇴', students: { number: 5, name: '이five' } }),
      entry({ id: 'b', student_id: 's9', date: '2026-08-03', status: '결석', students: { number: 9, name: '박nine' } }),
      entry({ id: 'c', student_id: 's2', date: '2026-08-03', status: '지각', students: { number: 2, name: '김two' } }),
      entry({ id: 'd', student_id: 's3', date: '2026-08-03', status: '결석', students: { number: 3, name: '최three' } }),
    ]

    const days = groupAttendanceByDate([new Date(2026, 7, 3)], entries)

    expect(days).toHaveLength(1)
    expect(days[0].date).toBe('20260803')
    expect(days[0].dayLabel).toBe('월')
    expect(days[0].entries.map((e) => e.student_id)).toEqual(['s3', 's9', 's2', 's5'])
  })

  it('fills in each requested day, defaulting to no entries when missing', () => {
    const entries: AttendanceEntryWithStudent[] = [
      entry({ id: 'a', student_id: 's1', date: '2026-08-03' }),
    ]

    const days = groupAttendanceByDate([new Date(2026, 7, 3), new Date(2026, 7, 4)], entries)

    expect(days[0].entries).toHaveLength(1)
    expect(days[1].date).toBe('20260804')
    expect(days[1].entries).toEqual([])
  })

  it('ignores entries whose date falls outside the requested days', () => {
    const entries: AttendanceEntryWithStudent[] = [
      entry({ id: 'a', student_id: 's1', date: '2026-08-10' }),
    ]

    const days = groupAttendanceByDate([new Date(2026, 7, 3)], entries)

    expect(days[0].entries).toEqual([])
  })

  it('drops an entry whose joined student is null', () => {
    // Can happen if a student was deleted after the attendance row was
    // created but before this query ran (FK is on delete cascade, but a
    // stale in-flight request could still race it).
    const entries: AttendanceEntryWithStudent[] = [
      entry({ id: 'a', student_id: 's1', date: '2026-08-03', students: null }),
    ]

    const days = groupAttendanceByDate([new Date(2026, 7, 3)], entries)

    expect(days[0].entries).toEqual([])
  })
})
