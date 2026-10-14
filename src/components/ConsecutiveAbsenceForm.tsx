import { useMemo, useState } from 'react'
import type { AttendanceEntry, AttendanceReasonCategory, SchoolEventByDate, Student } from '../lib/types'
import { weekdayDatesInRange } from '../lib/utils/attendanceDateRange'
import { isNonInstructionalDay } from '../lib/utils/schoolEvents'

type Props = {
  selectedDate: string
  students: Student[]
  entries: AttendanceEntry[]
  eventsByDate: SchoolEventByDate
  onClose: () => void
  onSave: (studentId: string, dates: string[], input: { reason_category: AttendanceReasonCategory; note: string | null }) => Promise<{ error?: string }>
}

const reasonCategories: AttendanceReasonCategory[] = ['질병', '미인정', '인정', '기타']

export function ConsecutiveAbsenceForm({ selectedDate, students, entries, eventsByDate, onClose, onSave }: Props) {
  const [studentId, setStudentId] = useState('')
  const [startDate, setStartDate] = useState(selectedDate)
  const [endDate, setEndDate] = useState(selectedDate)
  const [reasonCategory, setReasonCategory] = useState<AttendanceReasonCategory>('질병')
  const [note, setNote] = useState('')
  const [excludedDates, setExcludedDates] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const rangeTooLong = Boolean(startDate && endDate && (Date.parse(endDate) - Date.parse(startDate)) / 86400000 > 30)
  const weekdays = useMemo(() => rangeTooLong ? [] : weekdayDatesInRange(startDate, endDate), [startDate, endDate, rangeTooLong])
  const existingDates = new Set(entries.filter((entry) => entry.student_id === studentId).map((entry) => entry.date))
  const isSchoolClosed = (date: string) => isNonInstructionalDay(eventsByDate[date.replace(/-/g, '')] ?? [])
  const selectedDates = weekdays.filter((date) => !excludedDates.has(date) && !existingDates.has(date) && !isSchoolClosed(date))

  const changeRange = (kind: 'start' | 'end', value: string) => {
    if (kind === 'start') setStartDate(value)
    else setEndDate(value)
    setExcludedDates(new Set())
    setMessage(null)
    setSaved(false)
  }

  const handleSave = async () => {
    if (!studentId || selectedDates.length < 2 || saving) return
    setSaving(true)
    const result = await onSave(studentId, selectedDates, { reason_category: reasonCategory, note: note.trim() || null })
    setSaving(false)
    if (result.error) {
      setMessage(result.error)
      return
    }
    setMessage(`${selectedDates.length}일의 결석을 저장했습니다.`)
    setSaved(true)
  }

  return (
    <section className="mt-3 rounded-xl border border-brand-200 bg-white p-4" aria-labelledby="consecutive-absence-title">
      <div className="flex items-center justify-between gap-3">
        <h3 id="consecutive-absence-title" className="text-base font-semibold text-gray-900">연속 결석 입력</h3>
        <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-gray-100">닫기</button>
      </div>
      <p className="mt-1 text-sm text-gray-600">학생과 기간을 선택하면 평일을 표시합니다. 주말과 확인된 휴업일은 제외됩니다.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium text-gray-700">학생
          <select value={studentId} onChange={(e) => { setStudentId(e.target.value); setMessage(null); setSaved(false) }} className="mt-1 block h-10 w-full rounded-lg border border-gray-300 bg-white px-2">
            <option value="">학생 선택</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.number}번 {student.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">시작일
          <input type="date" value={startDate} onChange={(e) => changeRange('start', e.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-gray-300 px-2" />
        </label>
        <label className="text-sm font-medium text-gray-700">종료일
          <input type="date" value={endDate} onChange={(e) => changeRange('end', e.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-gray-300 px-2" />
        </label>
      </div>
      {rangeTooLong ? <p className="mt-3 text-sm text-red-700">한 번에 최대 31일의 기간을 선택할 수 있습니다.</p> : (
        <div className="mt-4">
          <p className="text-sm font-semibold text-gray-800">기록할 날짜 · {selectedDates.length}일</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {weekdays.map((date) => {
              const existing = existingDates.has(date)
              const closed = isSchoolClosed(date)
              const checked = !excludedDates.has(date) && !existing && !closed
              return (
                <label key={date} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${existing || closed ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-gray-300 bg-white text-gray-800'}`}>
                  <input type="checkbox" checked={checked} disabled={existing || closed || saved} onChange={(e) => setExcludedDates((prev) => {
                    const next = new Set(prev)
                    if (e.target.checked) next.delete(date)
                    else next.add(date)
                    return next
                  })} />
                  {date.slice(5)}{existing ? ' · 기록 있음' : closed ? ' · 수업일 아님' : ''}
                </label>
              )
            })}
          </div>
          {weekdays.length === 0 && <p className="mt-2 text-sm text-gray-500">시작일과 종료일을 확인해 주세요.</p>}
        </div>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
        <label className="text-sm font-medium text-gray-700">결석 구분
          <select value={reasonCategory} onChange={(e) => setReasonCategory(e.target.value as AttendanceReasonCategory)} className="mt-1 block h-10 w-full rounded-lg border border-gray-300 bg-white px-2">
            {reasonCategories.map((reason) => <option key={reason}>{reason}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">공통 메모
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="선택한 날짜에 같은 메모가 기록됩니다" className="mt-1 block h-10 w-full rounded-lg border border-gray-300 px-3" />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={handleSave} disabled={!studentId || selectedDates.length < 2 || saving || saved} className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? '저장 중...' : `${selectedDates.length}일 결석 저장`}
        </button>
        {message && <span role="status" className={`text-sm ${saved ? 'text-brand-700' : 'text-red-700'}`}>{message}</span>}
      </div>
      <p className="mt-3 text-xs text-gray-500">다른 달의 학사일정은 자동 확인되지 않습니다. 날짜를 확인하고 저장해 주세요. 기존 출결 기록은 변경하지 않습니다.</p>
    </section>
  )
}
