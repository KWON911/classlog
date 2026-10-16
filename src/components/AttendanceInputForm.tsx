import { useMemo, useRef, useState } from 'react'
import type { AttendanceEntry, AttendanceReasonCategory, AttendanceStatus, SchoolEventByDate, Student } from '../lib/types'
import type { AttendanceInput, AttendanceSaveResult } from '../lib/hooks/useAttendance'
import { weekdayDatesInRange } from '../lib/utils/attendanceDateRange'
import { isNonInstructionalDay } from '../lib/utils/schoolEvents'

type Props = {
  selectedDate: string
  students: Student[]
  entries: AttendanceEntry[]
  eventsByDate: SchoolEventByDate
  initialEntry?: AttendanceEntry
  allowSelectedDate?: boolean
  onClose: () => void
  onSave: (studentId: string, dates: string[], input: AttendanceInput, overwrite?: boolean) => Promise<AttendanceSaveResult>
}

const statuses: AttendanceStatus[] = ['결석', '지각', '조퇴', '결과']
const reasons: AttendanceReasonCategory[] = ['질병', '미인정', '인정', '기타']
const fieldClass = 'mt-1 block min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100'

export function AttendanceInputForm({ selectedDate, students, entries, eventsByDate, initialEntry, allowSelectedDate, onClose, onSave }: Props) {
  const [studentId, setStudentId] = useState(initialEntry?.student_id ?? '')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState(selectedDate)
  const [endDate, setEndDate] = useState(selectedDate)
  const [status, setStatus] = useState<AttendanceStatus>(initialEntry?.status ?? '결석')
  const [reason, setReason] = useState<AttendanceReasonCategory>(initialEntry?.reason_category ?? '질병')
  const [note, setNote] = useState(initialEntry?.note ?? '')
  const [excludedDates, setExcludedDates] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const studentSelect = useRef<HTMLSelectElement>(null)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [conflicts, setConflicts] = useState<string[]>([])
  const rangeTooLong = (Date.parse(endDate) - Date.parse(startDate)) / 86400000 > 30
  const weekdays = useMemo(() => weekdayDatesInRange(startDate, endDate), [startDate, endDate])
  const isClosed = (date: string) => !(allowSelectedDate && date === selectedDate) && isNonInstructionalDay(eventsByDate[date.replace(/-/g, '')] ?? [])
  const dates = weekdays.filter((date) => !excludedDates.has(date) && !isClosed(date))
  const existingDates = new Set(entries.filter((entry) => entry.student_id === studentId).map((entry) => entry.date))
  const filteredStudents = students.filter((student) => student.id === studentId || `${student.number} ${student.name}`.includes(search.trim()))

  const resetFeedback = () => { setMessage(''); setSuccess(false); setConflicts([]) }
  const changeRange = (kind: 'start' | 'end', value: string) => {
    if (kind === 'start') {
      setStartDate(value)
      if (endDate < value) setEndDate(value)
    } else setEndDate(value)
    setExcludedDates(new Set())
    resetFeedback()
  }
  const save = async (overwrite = false) => {
    if (!studentId || !dates.length || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setMessage('')
    setSuccess(false)
    try {
      const result = await onSave(studentId, dates, { status, reason_category: reason, note: note.trim() || null }, overwrite)
      if (result.error) { setMessage(result.error); return }
      if (result.conflicts?.length) { setConflicts(result.conflicts); return }
      const student = students.find((item) => item.id === studentId)
      setMessage(`${student?.name ?? '선택한 학생'} · ${dates.length}일 ${status}을 저장했습니다.`)
      setSuccess(true)
      setConflicts([])
      setStudentId('')
      setSearch('')
      setNote('')
      setExcludedDates(new Set())
      studentSelect.current?.focus()
    } catch {
      setMessage('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <section className="mt-3 rounded-xl border border-brand-200 bg-white p-4" aria-labelledby="attendance-input-title" aria-busy={saving}>
      <div className="flex items-center justify-between gap-3">
        <h3 id="attendance-input-title" className="text-base font-semibold text-gray-900">출결 입력</h3>
        <button type="button" disabled={saving} onClick={onClose} className="min-h-11 rounded-lg px-3 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50">닫기</button>
      </div>
      <p className="mt-1 text-sm text-gray-600">하루는 같은 날짜로, 여러 날은 기간으로 입력하세요. 주말과 확인된 휴업일은 제외됩니다.</p>
      <fieldset disabled={saving} className="mt-4 space-y-4 disabled:opacity-60">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">학생 검색
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="이름 또는 번호" className={fieldClass} />
          </label>
          <label className="text-sm font-medium text-gray-700">학생
            <select ref={studentSelect} value={studentId} onChange={(e) => { setStudentId(e.target.value); resetFeedback() }} className={fieldClass}>
              <option value="">학생 선택</option>
              {filteredStudents.map((student) => <option key={student.id} value={student.id}>{student.number}번 {student.name}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium text-gray-700">출결 상태
            <select value={status} onChange={(e) => { setStatus(e.target.value as AttendanceStatus); resetFeedback() }} className={fieldClass}>
              {statuses.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">시작일
            <input type="date" value={startDate} onChange={(e) => changeRange('start', e.target.value)} className={fieldClass} />
          </label>
          <label className="text-sm font-medium text-gray-700">종료일
            <input type="date" value={endDate} min={startDate} onChange={(e) => changeRange('end', e.target.value)} className={fieldClass} />
          </label>
        </div>
        {rangeTooLong ? <p className="text-sm text-red-700">한 번에 최대 31일의 기간을 선택할 수 있습니다.</p> : (
          <div>
            <p className="text-sm font-semibold text-gray-800">기록할 날짜 · {dates.length}일</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {weekdays.map((date) => (
                <label key={date} className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-sm ${isClosed(date) ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-gray-300 text-gray-800'}`}>
                  <input type="checkbox" checked={dates.includes(date)} disabled={isClosed(date)} onChange={(e) => {
                    setExcludedDates((prev) => { const next = new Set(prev); if (e.target.checked) next.delete(date); else next.add(date); return next })
                    resetFeedback()
                  }} />
                  {date.slice(5)}{isClosed(date) ? ' · 수업일 아님' : existingDates.has(date) ? ' · 기록 있음' : ''}
                </label>
              ))}
            </div>
            {!weekdays.length && <p className="mt-2 text-sm text-gray-500">선택한 기간에 평일이 없습니다. 시작일과 종료일을 확인해 주세요.</p>}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
          <label className="text-sm font-medium text-gray-700">{status} 구분
            <select value={reason} onChange={(e) => { setReason(e.target.value as AttendanceReasonCategory); resetFeedback() }} className={fieldClass}>
              {reasons.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">공통 메모
            <input value={note} onChange={(e) => { setNote(e.target.value); resetFeedback() }} placeholder="선택한 날짜에 같은 메모가 기록됩니다" className={fieldClass} />
          </label>
        </div>
      </fieldset>
      {conflicts.length > 0 && (
        <div role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p>기존 기록 {conflicts.length}건이 변경됩니다: {conflicts.join(', ')}. 선택한 상태·구분·메모로 저장할까요?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={saving} onClick={() => save(true)} className="min-h-11 rounded-lg bg-brand-600 px-4 font-semibold text-white disabled:opacity-50">{saving ? '저장 중...' : '기존 기록 변경 후 저장'}</button>
            <button type="button" disabled={saving} onClick={() => setConflicts([])} className="min-h-11 rounded-lg border border-gray-300 bg-white px-4">취소</button>
          </div>
        </div>
      )}
      {conflicts.length === 0 && <button type="button" onClick={() => save()} disabled={!studentId || !dates.length || saving || rangeTooLong} className="mt-4 min-h-11 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? '저장 중...' : `출결 저장 · ${dates.length}일 ${status}`}</button>}
      {message && <p role="status" className={`mt-3 text-sm ${success ? 'text-brand-700' : 'text-red-700'}`}>{message}</p>}
      <p className="mt-3 text-xs text-gray-500">다른 달의 학사일정은 자동 확인되지 않습니다. 날짜를 확인해 주세요. 기존 기록은 확인 후 변경합니다.</p>
    </section>
  )
}
