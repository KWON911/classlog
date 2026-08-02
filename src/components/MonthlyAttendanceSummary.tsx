import { Fragment, useMemo, useState } from 'react'
import type { AttendanceEntry, AttendanceStatus, Student } from '../lib/types'
import { AttendanceDeleteConfirmModal } from './AttendanceDeleteConfirmModal'

const STATUSES: AttendanceStatus[] = ['결석', '지각', '조퇴', '결과']

function formatMonthDay(date: string) {
  const [, month, day] = date.split('-')
  return `${Number(month)}/${Number(day)}`
}

type DeleteTarget = {
  recordId: string
  studentName: string
  date: string
  status: AttendanceStatus
}

type MonthlyAttendanceSummaryProps = {
  yearMonth: string
  students: Student[]
  entries: AttendanceEntry[]
  deleteEntry: (recordId: string) => Promise<{ error?: string }>
}

export function MonthlyAttendanceSummary({ yearMonth, students, entries, deleteEntry }: MonthlyAttendanceSummaryProps) {
  const [query, setQuery] = useState('')
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [messageIsError, setMessageIsError] = useState(false)

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

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.recordId)
    const result = await deleteEntry(deleteTarget.recordId)
    setDeletingId(null)
    setDeleteTarget(null)

    if (result.error) {
      setMessage('기록을 삭제하지 못했습니다. 다시 시도해 주세요.')
      setMessageIsError(true)
      return
    }
    setMessage('출결 기록을 삭제했습니다.')
    setMessageIsError(false)
  }

  return (
    <div className="max-w-[1050px]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">{yearMonth} 학급 전체 요약</h2>
        <input
          type="text"
          placeholder="학생 이름 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9 w-56 rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {message && (
        <p
          className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
            messageIsError ? 'border-red-100 bg-red-50 text-red-700' : 'border-blue-100 bg-blue-50 text-blue-700'
          }`}
          aria-live="polite"
        >
          {message}
        </p>
      )}

      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col style={{ width: 'auto' }} />
          {STATUSES.map((status) => (
            <col key={status} style={{ width: '84px' }} />
          ))}
        </colgroup>
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
                <tr className="h-11 border-b border-gray-100">
                  <td className="py-1">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(student.id)}
                      className="text-left text-gray-900 hover:text-blue-600"
                    >
                      {isExpanded ? '▾' : '▸'} {student.number}. {student.name}
                    </button>
                  </td>
                  {STATUSES.map((status) => (
                    <td key={status} className="text-center">
                      {row?.[status] ?? 0}
                    </td>
                  ))}
                </tr>
                {isExpanded && (
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <td colSpan={STATUSES.length + 1} className="p-3">
                      {studentEntries.length === 0 ? (
                        <p className="text-sm text-gray-500">이번 달 기록 없음</p>
                      ) : (
                        <ul className="flex flex-col gap-1.5">
                          {studentEntries.map((entry) => (
                            <li
                              key={entry.id}
                              className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1.5"
                            >
                              <span className="min-w-0 flex-1 text-sm text-gray-700">
                                {formatMonthDay(entry.date)} {entry.status} · {entry.reason_category}
                                {entry.note ? ` · ${entry.note}` : ''}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    recordId: entry.id,
                                    studentName: student.name,
                                    date: entry.date,
                                    status: entry.status,
                                  })
                                }
                                title="기록 삭제"
                                aria-label={`${formatMonthDay(entry.date)} ${student.name} ${entry.status} 기록 삭제`}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-600 focus:outline-none"
                              >
                                ✕
                              </button>
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

      {deleteTarget && (
        <AttendanceDeleteConfirmModal
          studentName={deleteTarget.studentName}
          date={deleteTarget.date}
          status={deleteTarget.status}
          deleting={deletingId === deleteTarget.recordId}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  )
}
