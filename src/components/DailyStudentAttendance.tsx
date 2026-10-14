import { useEffect, useMemo, useRef, useState } from 'react'
import type { AttendanceEntry, AttendanceReasonCategory, SchoolEvent, SchoolEventByDate, Student } from '../lib/types'
import { gradeScopeLabel, isNonInstructionalDay } from '../lib/utils/schoolEvents'
import { AttendanceStudentRow, type AttendanceDraftEntry } from './AttendanceStudentRow'
import { ConsecutiveAbsenceForm } from './ConsecutiveAbsenceForm'

type UpsertResult = { error?: string }

type DailyStudentAttendanceProps = {
  selectedDate: string
  students: Student[]
  entries: AttendanceEntry[]
  loading: boolean
  /** Already grade-filtered by the caller, scoped to selectedDate. */
  events: SchoolEvent[]
  eventsByDate?: SchoolEventByDate
  upsertEntry: (
    studentId: string,
    date: string,
    input: { status: NonNullable<AttendanceEntry['status']>; reason_category: AttendanceEntry['reason_category']; note: string | null },
  ) => Promise<UpsertResult>
  clearEntry: (studentId: string, date: string) => Promise<UpsertResult>
  addConsecutiveAbsences?: (studentId: string, dates: string[], input: { reason_category: AttendanceReasonCategory; note: string | null }) => Promise<UpsertResult>
  highlightStudentId?: string
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
  eventsByDate = {},
  upsertEntry,
  clearEntry,
  addConsecutiveAbsences,
  highlightStudentId,
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
  const [showConsecutiveForm, setShowConsecutiveForm] = useState(false)
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
    setConfirmingBulkPresent(false)
    setForceEnableInput(false)
    setStatusMessage(null)
  }, [selectedDate, entryByStudent, students])

  const scrolledForRef = useRef<string | null>(null)
  useEffect(() => {
    if (!highlightStudentId || loading) return
    if (scrolledForRef.current === highlightStudentId) return
    const el = document.getElementById(`student-row-${highlightStudentId}`)
    if (!el) return
    scrolledForRef.current = highlightStudentId
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightStudentId, loading, students])

  const updateDraft = (studentId: string, patch: Partial<AttendanceDraftEntry>) => {
    setShowConsecutiveForm(false)
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

  const exceptionStudents = students.filter((s) => (draft.get(s.id)?.status ?? '출석') !== '출석')
  const presentStudents = students.filter((s) => (draft.get(s.id)?.status ?? '출석') === '출석')
  const statusCounts = {
    출석: presentStudents.length,
    결석: exceptionStudents.filter((s) => draft.get(s.id)?.status === '결석').length,
    지각: exceptionStudents.filter((s) => draft.get(s.id)?.status === '지각').length,
    조퇴: exceptionStudents.filter((s) => draft.get(s.id)?.status === '조퇴').length,
    결과: exceptionStudents.filter((s) => draft.get(s.id)?.status === '결과').length,
  }

  const showAttendanceInput = !isNonInstructional || forceEnableInput

  return (
    <div className="@container flex flex-col">
      <h2 className="text-lg font-semibold text-gray-900">{formatSelectedDateTitle(selectedDate)}</h2>

      {events.length > 0 && (
        <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-2">
          <p className="text-xs font-semibold text-brand-700">오늘의 학사일정</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {events.map((event, i) => (
              <li key={i} className="text-sm text-brand-800">
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
          <div className="mt-4 flex flex-wrap gap-2" aria-label="선택한 날짜의 출결 현황">
            <span className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800">전체 {students.length}명</span>
            {Object.entries(statusCounts).map(([status, count]) => (
              <span key={status} className={`rounded-lg border px-3 py-2 text-sm font-medium ${status === '출석' ? 'border-brand-200 bg-brand-50 text-brand-800' : count > 0 ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-gray-200 bg-white text-gray-500'}`}>
                {status} <strong className="ml-1">{count}</strong>
              </span>
            ))}
          </div>
          <div className="sticky top-0 z-10 mt-3 flex flex-wrap items-center gap-2 border-b border-gray-200 bg-[#f5f3ef]/95 py-3 backdrop-blur-sm">
            {addConsecutiveAbsences && (
              <button type="button" onClick={() => setShowConsecutiveForm((value) => !value)} disabled={dirtyIds.size > 0} title={dirtyIds.size > 0 ? '먼저 현재 날짜의 변경사항을 저장해 주세요.' : undefined} className="h-9 rounded-lg border border-brand-300 bg-white px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50">
                연속 결석 입력
              </button>
            )}
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
                className="accent-brand-600"
              />
              예외 학생만 보기
            </label>
            <span className={`text-sm font-medium ${dirtyIds.size > 0 ? 'text-amber-800' : 'text-gray-500'}`} aria-live="polite">
              {saving ? '저장 중' : dirtyIds.size > 0 ? `저장 전 · ${dirtyIds.size}명 변경` : '변경사항 없음'}
            </span>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="ml-auto h-9 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? '저장 중...' : `출결 저장${dirtyIds.size > 0 ? ` (${dirtyIds.size}명 변경)` : ''}`}
            </button>
          </div>

          {showConsecutiveForm && addConsecutiveAbsences && (
            <ConsecutiveAbsenceForm
              key={selectedDate}
              selectedDate={selectedDate}
              students={students}
              entries={entries}
              eventsByDate={eventsByDate}
              onClose={() => setShowConsecutiveForm(false)}
              onSave={addConsecutiveAbsences}
            />
          )}

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
                  : 'border-brand-100 bg-brand-50 text-brand-700'
              }`}
              aria-live="polite"
            >
              {statusMessage}
            </p>
          )}

          {loading ? (
            <p className="mt-4 text-sm text-gray-500">불러오는 중...</p>
          ) : (
            <div className="mt-5 space-y-6">
              <section aria-labelledby="attendance-exceptions-title">
                <h3 id="attendance-exceptions-title" className="mb-2 text-sm font-semibold text-gray-900">확인 필요 · {exceptionStudents.length}명</h3>
                {exceptionStudents.length === 0 ? (
                  <p className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">지각·결석 등 예외 출결이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {exceptionStudents.map((student) => (
                      <AttendanceStudentRow key={student.id} studentId={student.id} number={student.number} name={student.name} draft={draft.get(student.id) ?? defaultDraft()} onChange={(patch) => updateDraft(student.id, patch)} highlighted={student.id === highlightStudentId} />
                    ))}
                  </div>
                )}
              </section>
              {!showChangedOnly && (
                <section aria-labelledby="attendance-present-title">
                  <h3 id="attendance-present-title" className="mb-2 text-sm font-semibold text-gray-900">출석 · {presentStudents.length}명</h3>
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                    {presentStudents.map((student) => (
                      <AttendanceStudentRow key={student.id} studentId={student.id} number={student.number} name={student.name} draft={draft.get(student.id) ?? defaultDraft()} onChange={(patch) => updateDraft(student.id, patch)} highlighted={student.id === highlightStudentId} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
