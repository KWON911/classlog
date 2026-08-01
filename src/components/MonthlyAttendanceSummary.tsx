import { Fragment, useMemo, useState } from 'react'
import type { AttendanceEntry, AttendanceStatus, Student } from '../lib/types'

const STATUSES: AttendanceStatus[] = ['결석', '지각', '조퇴', '결과']

function formatMonthDay(date: string) {
  const [, month, day] = date.split('-')
  return `${Number(month)}/${Number(day)}`
}

type MonthlyAttendanceSummaryProps = {
  yearMonth: string
  students: Student[]
  entries: AttendanceEntry[]
}

export function MonthlyAttendanceSummary({ yearMonth, students, entries }: MonthlyAttendanceSummaryProps) {
  const [query, setQuery] = useState('')
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(new Set())

  const summaryByStudent = useMemo(() => {
    const table = new Map<string, Record<AttendanceStatus, number>>()
    for (const student of students) {
      table.set(student.id, { 결석: 0, 지각: 0, 조퇴: 0, 결과: 0 })
    }
    for (const entry of entries) {
      const row = table.get(entry.student_id)
      if (row) {
        row[entry.status] += 1
      }
    }
    return table
  }, [students, entries])

  const entriesByStudent = useMemo(() => {
    const map = new Map<string, AttendanceEntry[]>()
    for (const entry of entries) {
      const list = map.get(entry.student_id) ?? []
      list.push(entry)
      map.set(entry.student_id, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.date.localeCompare(b.date))
    }
    return map
  }, [entries])

  const visibleStudents = students.filter((s) => s.name.includes(query.trim()))

  const toggleExpanded = (studentId: string) => {
    setExpandedStudentIds((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }
      return next
    })
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{yearMonth} 학급 전체 요약</h2>
        <input
          type="text"
          placeholder="학생 이름 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9 w-40 rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="py-2 font-medium text-gray-500">학생</th>
            {STATUSES.map((status) => (
              <th key={status} className="py-2 text-center font-medium text-gray-500">
                {status}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleStudents.map((student) => {
            const row = summaryByStudent.get(student.id)
            const isExpanded = expandedStudentIds.has(student.id)
            const studentEntries = entriesByStudent.get(student.id) ?? []
            return (
              <Fragment key={student.id}>
                <tr className="border-b border-gray-100">
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(student.id)}
                      className="text-left text-gray-900 hover:text-blue-600"
                    >
                      {isExpanded ? '▾' : '▸'} {student.number}. {student.name}
                    </button>
                  </td>
                  {STATUSES.map((status) => (
                    <td key={status} className="py-2 text-center">
                      {row?.[status] ?? 0}
                    </td>
                  ))}
                </tr>
                {isExpanded && (
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <td colSpan={STATUSES.length + 1} className="py-3 pl-6 text-sm text-gray-600">
                      {studentEntries.length === 0 ? (
                        '이번 달 기록 없음'
                      ) : (
                        <ul className="flex flex-col gap-1">
                          {studentEntries.map((entry) => (
                            <li key={entry.id}>
                              {formatMonthDay(entry.date)} {entry.status}({entry.reason_category})
                              {entry.note ? ` - ${entry.note}` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
