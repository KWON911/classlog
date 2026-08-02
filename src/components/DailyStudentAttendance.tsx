import { useEffect, useMemo, useState } from 'react'
import type { AttendanceEntry, SchoolEvent, Student } from '../lib/types'
import { gradeScopeLabel, isNonInstructionalDay } from '../lib/utils/schoolEvents'
import { AttendanceStudentRow, type AttendanceDraftEntry } from './AttendanceStudentRow'

type UpsertResult = { error?: string }

type DailyStudentAttendanceProps = {
  selectedDate: string
  students: Student[]
  entries: AttendanceEntry[]
  loading: boolean
  /** Already grade-filtered by the caller, scoped to selectedDate. */
  events: SchoolEvent[]
  upsertEntry: (
    studentId: string,
    date: string,
    input: { status: NonNullable<AttendanceEntry['status']>; reason_category: AttendanceEntry['reason_category']; note: string | null },
  ) => Promise<UpsertResult>
  clearEntry: (studentId: string, date: string) => Promise<UpsertResult>
}

function formatSelectedDateTitle(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'long' }).format(date)
  return `${y}년 ${m}월 ${d}일 ${weekday} 출결`
}

function defaultDraft(): AttendanceDraftEntry {
  return { status: '출석', reasonCategory: '질병', note: '' }
}

export function DailyStudentAttendance({
  selectedDate,
  students,
  entries,
  loading,
  events,
  upsertEntry,
  clearEntry,
}: DailyStudentAttendanceProps) {
  const entryByStudent = useMemo(() => {
    const map = new Map<string, AttendanceEntry>()
    for (const entry of entries) {
      if (entry.date === selectedDate) {
        map.set(entry.student_id, entry)
      }
    }
    return map
  }, [entries, selectedDate])

  const [draft, setDraft] = useState<Map<string, AttendanceDraftEntry>>(new Map())
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set())
  const [showChangedOnly, setShowChangedOnly] = useState(false)
  const [confirmingBulkPresent, setConfirmingBulkPresent] = useState(false)
  const [forceEnableInput, setForceEnableInput] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusIsError, setStatusIsError] = useState(false)

  const isNonInstructional = isNonInstructionalDay(events)

  useEffect(() => {
    const next = new Map<string, AttendanceDraftEntry>()
    for (const student of students) {
      const entry = entryByStudent.get(student.id)
      next.set(
        student.id,
        entry
          ? { status: entry.status, reasonCategory: entry.reason_category, note: entry.note ?? '' }
          : defaultDraft(),
      )
    }
    setDraft(next)
    setDirtyIds(new Set())
    setShowChangedOnly(false)
    setConfirmingBulkPresent(false)
    setForceEnableInput(false)
    setStatusMessage(null)
  }, [selectedDate, entryByStudent, students])

  const updateDraft = (studentId: string, patch: Partial<AttendanceDraftEntry>) => {
    setDraft((prev) => {
      const next = new Map(prev)
      const current = next.get(studentId) ?? defaultDraft()
      next.set(studentId, { ...current, ...patch })
      return next
    })
    setDirtyIds((prev) => new Set(prev).add(studentId))
  }

  const existingExceptionCount = entryByStudent.size

  const handleBulkPresentClick = () => {
    if (existingExceptionCount > 0 && !confirmingBulkPresent) {
      setConfirmingBulkPresent(true)
      return
    }
    setDraft((prev) => {
      const next = new Map(prev)
      for (const student of students) {
        next.set(student.id, defaultDraft())
      }
      return next
    })
    setDirtyIds(new Set(students.map((s) => s.id)))
    setConfirmingBulkPresent(false)
    setStatusMessage('모든 학생을 출석으로 표시했습니다. 저장을 눌러야 실제로 반영됩니다.')
    setStatusIsError(false)
  }

  const handleSave = async () => {
    if (dirtyIds.size === 0) {
      setStatusMessage('변경된 내용이 없습니다.')
      setStatusIsError(false)
      return
    }

    setSaving(true)
    const results = await Promise.all(
      [...dirtyIds].map(async (studentId) => {
        const entry = draft.get(studentId)
        if (!entry) return { error: undefined }
        if (entry.status === '출석') {
          return clearEntry(studentId, selectedDate)
        }
        return upsertEntry(studentId, selectedDate, {
          status: entry.status,
          reason_category: entry.reasonCategory,
          note: entry.note || null,
        })
      }),
    )
    setSaving(false)

    const failed = results.filter((r) => r.error)
    if (failed.length > 0) {
      setStatusMessage(`${failed.length}건 저장에 실패했습니다: ${failed[0].error}`)
      setStatusIsError(true)
      return
    }

    setDirtyIds(new Set())
    setStatusMessage(`${formatSelectedDateTitle(selectedDate)} 내용을 저장했습니다.`)
    setStatusIsError(false)
  }

  const visibleStudents = showChangedOnly
    ? students.filter((s) => draft.get(s.id)?.status !== '출석')
    : students

  const showAttendanceInput = !isNonInstructional || forceEnableInput

  return (
    <div className="@container flex flex-col">
      <h2 className="text-lg font-semibold text-gray-900">{formatSelectedDateTitle(selectedDate)}</h2>

      {events.length > 0 && (
        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2">
          <p className="text-xs font-semibold text-blue-700">오늘의 학사일정</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {events.map((event, i) => (
              <li key={i} className="text-sm text-blue-800">
                · {event.name} · {gradeScopeLabel(event)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!showAttendanceInput ? (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center">
          <p className="text-sm text-gray-600">
            이 날짜는 학사일정상 수업일이 아닌 것으로 보입니다 (방학·휴업일 등). 필요하면 아래 버튼을 눌러 출결을
            입력할 수 있습니다.
          </p>
          <button
            type="button"
            onClick={() => setForceEnableInput(true)}
            className="mt-3 h-9 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            이 날짜에도 출결 입력
          </button>
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleBulkPresentClick}
              className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              전체 출석 처리
            </button>
            <label className="flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showChangedOnly}
                onChange={(e) => setShowChangedOnly(e.target.checked)}
                className="accent-blue-600"
              />
              변경 학생만 보기
            </label>
            {dirtyIds.size > 0 && <span className="text-sm text-gray-500">변경 {dirtyIds.size}명</span>}
          </div>

          {confirmingBulkPresent && (
            <p
              className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
              aria-live="polite"
            >
              이 날짜에는 이미 저장된 예외 기록이 {existingExceptionCount}건 있습니다. 전체 출석으로 바꾸면 저장 시
              해당 기록이 모두 사라집니다.{' '}
              <button type="button" onClick={handleBulkPresentClick} className="font-semibold underline">
                그래도 전체 출석으로 변경
              </button>{' '}
              <button
                type="button"
                onClick={() => setConfirmingBulkPresent(false)}
                className="font-semibold underline"
              >
                취소
              </button>
            </p>
          )}

          {statusMessage && (
            <p
              className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                statusIsError
                  ? 'border-red-100 bg-red-50 text-red-700'
                  : 'border-blue-100 bg-blue-50 text-blue-700'
              }`}
              aria-live="polite"
            >
              {statusMessage}
            </p>
          )}

          {loading ? (
            <p className="mt-4 text-sm text-gray-500">불러오는 중...</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-2.5 @md:grid-cols-2 @2xl:grid-cols-3">
              {visibleStudents.map((student) => (
                <AttendanceStudentRow
                  key={student.id}
                  number={student.number}
                  name={student.name}
                  draft={draft.get(student.id) ?? defaultDraft()}
                  onChange={(patch) => updateDraft(student.id, patch)}
                />
              ))}
            </div>
          )}

          <div className="sticky bottom-0 mt-4 border-t border-gray-200 bg-white/95 py-3 backdrop-blur-sm">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-11 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 sm:w-auto sm:px-6"
            >
              {saving ? '저장 중...' : `출결 저장${dirtyIds.size > 0 ? ` (${dirtyIds.size}명 변경)` : ''}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
