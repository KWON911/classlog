import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import type { AttendanceEntry, AttendanceStatus, Student } from '../lib/types'
import { AttendanceDeleteConfirmModal } from './AttendanceDeleteConfirmModal'
import { ATTENDANCE_STATUS_COLOR_CLASS } from '../lib/utils/attendanceStatusColors'

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

function countLabelClass(count: number) {
  return count > 0 ? 'font-semibold text-gray-900' : 'text-gray-300'
}

function AttendanceCounts({ counts, size }: { counts: CountRow; size: 'desktop' | 'mobile' }) {
  if (size === 'desktop') {
    return (
      <div className="grid grid-cols-4">
        {STATUSES.map((status) => (
          <span
            key={status}
            aria-label={`${status} ${counts[status]}건`}
            className={`w-16 text-center text-sm ${countLabelClass(counts[status])}`}
          >
            {counts[status]}
          </span>
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-4 gap-1">
      {STATUSES.map((status) => (
        <div key={status} className="flex flex-col items-center">
          <span className="text-[10px] text-gray-400">{status}</span>
          <span aria-label={`${status} ${counts[status]}건`} className={`text-sm ${countLabelClass(counts[status])}`}>
            {counts[status]}
          </span>
        </div>
      ))}
    </div>
  )
}

type StudentSummaryRowProps = {
  student: Student
  counts: CountRow
  recordCount: number
  isExpanded: boolean
  detailId: string
  onToggle: () => void
}

function StudentSummaryRow({ student, counts, recordCount, isExpanded, detailId, onToggle }: StudentSummaryRowProps) {
  const hasRecords = recordCount > 0
  const rowClass = `w-full border-b border-gray-100 px-4 py-2.5 text-left transition-colors ${
    isExpanded ? 'border-l-2 border-l-brand-500 bg-brand-50/40' : hasRecords ? 'hover:bg-gray-50/70' : ''
  }`

  const content = (
    <>
      <div className="hidden items-center gap-2 md:grid md:grid-cols-[minmax(220px,280px)_auto_minmax(24px,1fr)_auto]">
        <span className="truncate text-sm font-medium text-gray-900">
          {student.number}. {student.name}
        </span>
        <AttendanceCounts counts={counts} size="desktop" />
        <span />
        <span className="flex items-center gap-1.5 text-sm text-gray-500">
          {hasRecords ? `${recordCount}건` : '—'}
          {hasRecords && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 md:hidden">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-gray-900">
            {student.number}. {student.name}
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-sm text-gray-500">
            {hasRecords ? `${recordCount}건` : '—'}
            {hasRecords && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
          </span>
        </div>
        <AttendanceCounts counts={counts} size="mobile" />
      </div>
    </>
  )

  if (!hasRecords) {
    return <div className={rowClass}>{content}</div>
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-controls={detailId}
      className={rowClass}
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
  const deleteButton = (
    <button
      type="button"
      onClick={onDeleteClick}
      title="출결 기록 삭제"
      aria-label={`${studentName} 학생 ${formatMonthDay(entry.date)} ${entry.status} 기록 삭제`}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-600 focus:outline-none"
    >
      <Trash2 size={16} />
    </button>
  )

  const statusBadge = (
    <span
      className={`inline-flex h-[25px] w-fit items-center justify-center rounded-full px-2.5 text-[12px] font-semibold ${ATTENDANCE_STATUS_COLOR_CLASS[entry.status]}`}
    >
      {entry.status}
    </span>
  )

  return (
    <div className="border-b border-gray-200 py-2 text-sm last:border-b-0">
      <div className="hidden items-center gap-2 md:grid md:h-[42px] md:grid-cols-[40px_72px_84px_92px_minmax(0,1fr)] md:py-0">
        {deleteButton}
        <span className="text-gray-500">{formatMonthDay(entry.date)}</span>
        {statusBadge}
        <span className="text-gray-700">{entry.reason_category}</span>
        <span className="min-w-0 truncate text-gray-600" title={entry.note ?? undefined}>
          {entry.note ?? ''}
        </span>
      </div>

      <div className="flex flex-col gap-1 md:hidden">
        <div className="flex items-center gap-2">
          {deleteButton}
          <span className="text-gray-500">{formatMonthDay(entry.date)}</span>
          {statusBadge}
          <span className="text-gray-700">{entry.reason_category}</span>
        </div>
        <span className="min-w-0 truncate pl-[48px] text-gray-600">{entry.note ?? ''}</span>
      </div>
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

      <div className="hidden border-b border-gray-200 px-4 py-2 text-xs font-medium text-gray-500 md:grid md:grid-cols-[minmax(220px,280px)_auto_minmax(24px,1fr)_auto] md:items-center md:gap-2">
        <span>학생</span>
        <div className="grid grid-cols-4">
          {STATUSES.map((status) => (
            <span key={status} className="w-16 text-center">
              {status}
            </span>
          ))}
        </div>
        <span />
        <span>상세</span>
      </div>

      <div>
        {visibleStudents.map((student) => {
          const counts = summaryByStudent.get(student.id) ?? { 결석: 0, 지각: 0, 조퇴: 0, 결과: 0 }
          const recordCount = recordCountByStudent.get(student.id) ?? 0
          const isExpanded = expandedStudentIds.has(student.id)
          const studentEntries = entriesByStudent.get(student.id) ?? []
          const detailId = `attendance-detail-${student.id}`

          return (
            <div key={student.id}>
              <StudentSummaryRow
                student={student}
                counts={counts}
                recordCount={recordCount}
                isExpanded={isExpanded}
                detailId={detailId}
                onToggle={() => toggleExpanded(student.id)}
              />
              {isExpanded && recordCount > 0 && (
                <div id={detailId} className="border-l-2 border-brand-300 bg-[#F8FAFC] py-1 pl-8 pr-4 md:pl-9">
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
