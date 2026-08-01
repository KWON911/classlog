import { Fragment, useMemo, useState } from 'react'
import { useStudents } from '../lib/hooks/useStudents'
import { useAttendance } from '../lib/hooks/useAttendance'
import { AttendanceEditRow } from '../components/AttendanceEditRow'
import { AttendanceCalendar } from '../components/AttendanceCalendar'
import type { AttendanceReasonCategory, AttendanceStatus } from '../lib/types'

const STATUSES: AttendanceStatus[] = ['결석', '지각', '조퇴', '결과']

function todayYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(yearMonth: string, delta: number) {
  const [year, month] = yearMonth.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function daysInMonth(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

function isWeekday(yearMonth: string, day: number) {
  const [year, month] = yearMonth.split('-').map(Number)
  const dayOfWeek = new Date(year, month - 1, day).getDay()
  return dayOfWeek >= 1 && dayOfWeek <= 5
}

function firstWeekdayOfMonth(yearMonth: string) {
  const total = daysInMonth(yearMonth)
  for (let day = 1; day <= total; day++) {
    if (isWeekday(yearMonth, day)) {
      return `${yearMonth}-${String(day).padStart(2, '0')}`
    }
  }
  return `${yearMonth}-01`
}

function formatMonthDay(date: string) {
  const [, month, day] = date.split('-')
  return `${Number(month)}/${Number(day)}`
}

export function AttendancePage() {
  const [yearMonth, setYearMonth] = useState(todayYearMonth())
  const [selectedDate, setSelectedDate] = useState(firstWeekdayOfMonth(todayYearMonth()))
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(new Set())

  const { students, error: studentsError } = useStudents()
  const { entries, loading, error, upsertEntry, clearEntry } = useAttendance(yearMonth)

  const entryByStudentAndDate = useMemo(() => {
    const map = new Map<string, (typeof entries)[number]>()
    for (const entry of entries) {
      map.set(`${entry.student_id}_${entry.date}`, entry)
    }
    return map
  }, [entries])

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
    const map = new Map<string, typeof entries>()
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

  const handleSave = async (
    studentId: string,
    status: AttendanceStatus,
    reasonCategory: AttendanceReasonCategory,
    note: string,
  ) => {
    const result = await upsertEntry(studentId, selectedDate, {
      status,
      reason_category: reasonCategory,
      note: note || null,
    })
    if (!result.error) {
      setEditingStudentId(null)
    }
  }

  const handleClear = async (studentId: string) => {
    await clearEntry(studentId, selectedDate)
    setEditingStudentId(null)
  }

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

  const editingStudent = students.find((s) => s.id === editingStudentId)
  const editingEntry = editingStudentId
    ? entryByStudentAndDate.get(`${editingStudentId}_${selectedDate}`)
    : undefined

  const days = Array.from({ length: daysInMonth(yearMonth) }, (_, i) => i + 1).filter((day) =>
    isWeekday(yearMonth, day),
  )

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">출결관리</h1>

      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => {
            const next = shiftMonth(yearMonth, -1)
            setYearMonth(next)
            setSelectedDate(firstWeekdayOfMonth(next))
            setEditingStudentId(null)
          }}
          className="rounded border border-gray-300 px-2 py-1"
        >
          ◀
        </button>
        <span className="font-medium">{yearMonth}</span>
        <button
          onClick={() => {
            const next = shiftMonth(yearMonth, 1)
            setYearMonth(next)
            setSelectedDate(firstWeekdayOfMonth(next))
            setEditingStudentId(null)
          }}
          className="rounded border border-gray-300 px-2 py-1"
        >
          ▶
        </button>
        <select
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value)
            setEditingStudentId(null)
          }}
          className="rounded border border-gray-300 px-2 py-1"
        >
          {days.map((day) => {
            const date = `${yearMonth}-${String(day).padStart(2, '0')}`
            return (
              <option key={date} value={date}>
                {day}일
              </option>
            )
          })}
        </select>
      </div>

      {loading && <p>불러오는 중...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {studentsError && <p className="text-red-600">{studentsError}</p>}

      <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {students.map((student) => {
          const entry = entryByStudentAndDate.get(`${student.id}_${selectedDate}`)
          return (
            <button
              key={student.id}
              onClick={() =>
                setEditingStudentId(editingStudentId === student.id ? null : student.id)
              }
              className={`rounded border border-gray-200 p-2 text-sm ${entry ? 'text-red-600' : ''}`}
            >
              {student.number}. {student.name}
            </button>
          )
        })}
      </div>

      {editingStudent && (
        <div className="mb-8 rounded border border-gray-200 p-4">
          <p className="mb-2 text-sm font-medium">
            {editingStudent.number}. {editingStudent.name} 입력:
          </p>
          <AttendanceEditRow
            key={editingStudent.id}
            initialStatus={editingEntry?.status}
            initialReasonCategory={editingEntry?.reason_category}
            initialNote={editingEntry?.note ?? undefined}
            onSave={(status, reasonCategory, note) =>
              handleSave(editingStudent.id, status, reasonCategory, note)
            }
            onClear={editingEntry ? () => handleClear(editingStudent.id) : undefined}
            onCancel={() => setEditingStudentId(null)}
          />
        </div>
      )}

      <AttendanceCalendar yearMonth={yearMonth} entries={entries} students={students} />

      <h2 className="mb-2 text-lg font-semibold">{yearMonth} 학급 전체 요약</h2>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-300 text-left">
            <th className="py-1">학생</th>
            {STATUSES.map((status) => (
              <th key={status} className="py-1 text-center">
                {status}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const row = summaryByStudent.get(student.id)
            const isExpanded = expandedStudentIds.has(student.id)
            const studentEntries = entriesByStudent.get(student.id) ?? []
            return (
              <Fragment key={student.id}>
                <tr className="border-b border-gray-100">
                  <td className="py-1">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(student.id)}
                      className="text-left hover:underline"
                    >
                      {isExpanded ? '▾' : '▸'} {student.number}. {student.name}
                    </button>
                  </td>
                  {STATUSES.map((status) => (
                    <td key={status} className="py-1 text-center">
                      {row?.[status] ?? 0}
                    </td>
                  ))}
                </tr>
                {isExpanded && (
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <td colSpan={STATUSES.length + 1} className="py-2 pl-6 text-sm text-gray-600">
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
