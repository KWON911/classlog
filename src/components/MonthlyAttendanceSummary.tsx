import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import type { AttendanceEntry, AttendanceStatus, Student } from '../lib/types'
import { AttendanceDeleteConfirmModal } from './AttendanceDeleteConfirmModal'
import { ATTENDANCE_STATUS_COLOR_CLASS, ATTENDANCE_ZERO_COUNT_BADGE_CLASS } from '../lib/utils/attendanceStatusColors'

const STATUSES: AttendanceStatus[] = ['결석', '지각', '조퇴', '결과']

type FilterMode = 'all' | 'withRecords'

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
  students: Student[]
  entries: AttendanceEntry[]
  deleteEntry: (recordId: string) => Promise<{ error?: string }>
}

type CountRow = Record<AttendanceStatus, number>

function ClassTotalCard({ status, count }: { status: AttendanceStatus; count: number }) {
  return (
    <div className={`rounded-xl px-4 py-3 ${ATTENDANCE_STATUS_COLOR_CLASS[status]}`}>
      <p className="text-xs font-semibold opacity-80">{status}</p>
      <p className="text-2xl font-bold">{count}</p>
    </div>
  )
}

function ClassTotalsCards({ totals }: { totals: CountRow }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STATUSES.map((status) => (
        <ClassTotalCard key={status} status={status} count={totals[status]} />
      ))}
    </div>
  )
}

function AttendanceBadge({ status, count }: { status: AttendanceStatus; count: number }) {
  const colorClass = count > 0 ? ATTENDANCE_STATUS_COLOR_CLASS[status] : ATTENDANCE_ZERO_COUNT_BADGE_CLASS
  return (
    <span
      aria-label={`${status} ${count}건`}
      className={`inline-flex h-6 items-center justify-center whitespace-nowrap rounded-full px-2.5 text-xs font-semibold ${colorClass}`}
    >
      {status} {count}
    </span>
  )
}

function AttendanceBadgeGroup({ counts }: { counts: CountRow }) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {STATUSES.map((status) => (
        <AttendanceBadge key={status} status={status} count={counts[status]} />
      ))}
    </div>
  )
}

type StudentSummaryCardHeaderProps = {
  student: Student
  counts: CountRow
  hasRecords: boolean
  isExpanded: boolean
  detailId: string
  onToggle: () => void
}

function StudentSummaryCardHeader({
  student,
  counts,
  hasRecords,
  isExpanded,
  detailId,
  onToggle,
}: StudentSummaryCardHeaderProps) {
  const content = (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
          {student.number}
        </span>
        <span className="text-sm font-semibold text-gray-900">{student.name}</span>
      </div>
      {hasRecords ? (
        <div className="flex items-center gap-3">
          <AttendanceBadgeGroup counts={counts} />
          {isExpanded ? (
            <ChevronDown size={16} className="shrink-0 text-brand-600" />
          ) : (
            <ChevronRight size={16} className="shrink-0 text-gray-400" />
          )}
        </div>
      ) : (
        <span className="text-sm text-gray-500">기록 없음</span>
      )}
    </div>
  )

  if (!hasRecords) {
    return content
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-controls={detailId}
      className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
    >
      {content}
    </button>
  )
}

type DetailRecordProps = {
  entry: AttendanceEntry
  studentName: string
  onDeleteClick: () => void
}

function DetailRecord({ entry, studentName, onDeleteClick }: DetailRecordProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-brand-100 py-2 text-sm first:border-t-0">
      <button
        type="button"
        onClick={onDeleteClick}
        title="출결 기록 삭제"
        aria-label={`${studentName} 학생 ${formatMonthDay(entry.date)} ${entry.status} 기록 삭제`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-600 focus:outline-none"
      >
        <Trash2 size={14} />
      </button>
      <span className="w-12 shrink-0 text-gray-500">{formatMonthDay(entry.date)}</span>
      <span
        className={`inline-flex h-[22px] items-center justify-center rounded-full px-2 text-[11px] font-semibold ${ATTENDANCE_STATUS_COLOR_CLASS[entry.status]}`}
      >
        {entry.status}
      </span>
      <span className="text-gray-700">{entry.reason_category}</span>
      {entry.note && <span className="text-gray-600">· {entry.note}</span>}
    </div>
  )
}

export function MonthlyAttendanceSummary({ students, entries, deleteEntry }: MonthlyAttendanceSummaryProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [messageIsError, setMessageIsError] = useState(false)

  const summaryByStudent = useMemo(() => {
    const table = new Map<string, CountRow>()
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

  const classTotals = useMemo(() => {
    const totals: CountRow = { 결석: 0, 지각: 0, 조퇴: 0, 결과: 0 }
    for (const entry of entries) {
      totals[entry.status] += 1
    }
    return totals
  }, [entries])

  const recordCountByStudent = useMemo(() => {
    const map = new Map<string, number>()
    for (const [studentId, counts] of summaryByStudent) {
      map.set(studentId, STATUSES.reduce((sum, status) => sum + counts[status], 0))
    }
    return map
  }, [summaryByStudent])

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

  const studentsWithRecordsCount = useMemo(
    () => students.filter((s) => (recordCountByStudent.get(s.id) ?? 0) > 0).length,
    [students, recordCountByStudent],
  )

  const visibleStudents = useMemo(
    () =>
      filterMode === 'withRecords'
        ? students.filter((s) => (recordCountByStudent.get(s.id) ?? 0) > 0)
        : students,
    [students, filterMode, recordCountByStudent],
  )

  const expandableVisibleIds = useMemo(
    () => visibleStudents.filter((s) => (recordCountByStudent.get(s.id) ?? 0) > 0).map((s) => s.id),
    [visibleStudents, recordCountByStudent],
  )
  const allVisibleExpanded =
    expandableVisibleIds.length > 0 && expandableVisibleIds.every((id) => expandedStudentIds.has(id))

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

  const handleToggleAll = () => {
    setExpandedStudentIds((prev) => {
      const next = new Set(prev)
      if (allVisibleExpanded) {
        for (const id of expandableVisibleIds) next.delete(id)
      } else {
        for (const id of expandableVisibleIds) next.add(id)
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
    <div className="w-full">
      <ClassTotalsCards totals={classTotals} />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          전체 {students.length}명 · 기록 학생 {studentsWithRecordsCount}명 · 출결 기록 {entries.length}건
        </p>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-300 p-0.5">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filterMode === 'all' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              전체 {students.length}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('withRecords')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filterMode === 'withRecords' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              기록 있음 {studentsWithRecordsCount}
            </button>
          </div>
          <button
            type="button"
            onClick={handleToggleAll}
            disabled={expandableVisibleIds.length === 0}
            className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {allVisibleExpanded ? '모두 접기' : '모두 펼치기'}
          </button>
        </div>
      </div>

      {message && (
        <p
          className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
            messageIsError ? 'border-red-100 bg-red-50 text-red-700' : 'border-brand-100 bg-brand-50 text-brand-700'
          }`}
          aria-live="polite"
        >
          {message}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {visibleStudents.map((student) => {
          const counts = summaryByStudent.get(student.id) ?? { 결석: 0, 지각: 0, 조퇴: 0, 결과: 0 }
          const hasRecords = (recordCountByStudent.get(student.id) ?? 0) > 0
          const isExpanded = expandedStudentIds.has(student.id)
          const studentEntries = entriesByStudent.get(student.id) ?? []
          const detailId = `attendance-detail-${student.id}`

          return (
            <div
              key={student.id}
              className={`overflow-hidden rounded-xl border transition-colors ${
                !hasRecords
                  ? 'border-gray-100 bg-gray-50/60'
                  : isExpanded
                    ? 'border-brand-300 bg-brand-50/40'
                    : 'border-gray-200 bg-white hover:border-brand-200'
              }`}
            >
              <StudentSummaryCardHeader
                student={student}
                counts={counts}
                hasRecords={hasRecords}
                isExpanded={isExpanded}
                detailId={detailId}
                onToggle={() => toggleExpanded(student.id)}
              />
              {isExpanded && hasRecords && (
                <div id={detailId} className="border-t border-brand-100 px-4 pb-3 pt-1">
                  {studentEntries.map((entry) => (
                    <DetailRecord
                      key={entry.id}
                      entry={entry}
                      studentName={student.name}
                      onDeleteClick={() =>
                        setDeleteTarget({
                          recordId: entry.id,
                          studentName: student.name,
                          date: entry.date,
                          status: entry.status,
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

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
