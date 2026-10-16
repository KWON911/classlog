import { useEffect, useRef, useState } from 'react'
import type { AttendanceEntry, SchoolEvent, SchoolEventByDate, Student } from '../lib/types'
import type { AttendanceInput, AttendanceSaveResult } from '../lib/hooks/useAttendance'
import { gradeScopeLabel, isNonInstructionalDay } from '../lib/utils/schoolEvents'
import { AttendanceInputForm } from './AttendanceInputForm'
import { AttendanceDeleteConfirmModal } from './AttendanceDeleteConfirmModal'

type Props = {
  selectedDate: string
  students: Student[]
  entries: AttendanceEntry[]
  loading: boolean
  events: SchoolEvent[]
  eventsByDate?: SchoolEventByDate
  saveAttendanceRange: (studentId: string, dates: string[], input: AttendanceInput, overwrite?: boolean) => Promise<AttendanceSaveResult>
  clearEntry: (studentId: string, date: string) => Promise<{ error?: string }>
  highlightStudentId?: string
}

function formatSelectedDateTitle(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'long' }).format(new Date(y, m - 1, d))
  return `${y}년 ${m}월 ${d}일 ${weekday} 출결`
}

export function DailyStudentAttendance({ selectedDate, students, entries, loading, events, eventsByDate = {}, saveAttendanceRange, clearEntry, highlightStudentId }: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<AttendanceEntry | undefined>()
  const [formKey, setFormKey] = useState(0)
  const [forceEnableInput, setForceEnableInput] = useState(false)
  const [deletingEntry, setDeletingEntry] = useState<AttendanceEntry | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const deleteRef = useRef(false)
  const isNonInstructional = isNonInstructionalDay(events)
  const showInput = !isNonInstructional || forceEnableInput
  const dayEntries = students.flatMap((student) => {
    const entry = entries.find((item) => item.student_id === student.id && item.date === selectedDate)
    return entry ? [{ student, entry }] : []
  })

  useEffect(() => {
    setForceEnableInput(false)
    setFormOpen(false)
    setEditingEntry(undefined)
    setDeletingEntry(null)
    setDeleteError('')
  }, [selectedDate])

  useEffect(() => {
    if (!highlightStudentId || loading) return
    document.getElementById(`student-row-${highlightStudentId}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  }, [highlightStudentId, selectedDate, loading])

  const openForm = (entry?: AttendanceEntry) => {
    setEditingEntry(entry)
    setFormKey((value) => value + 1)
    setFormOpen(true)
  }
  const deleteRecord = async () => {
    if (!deletingEntry || deleteRef.current) return
    deleteRef.current = true
    setDeleting(true)
    setDeleteError('')
    try {
      const result = await clearEntry(deletingEntry.student_id, deletingEntry.date)
      if (result.error) { setDeleteError(result.error); return }
      setDeletingEntry(null)
    } catch {
      setDeleteError('기록을 삭제하지 못했습니다. 다시 시도해 주세요.')
    } finally {
      deleteRef.current = false
      setDeleting(false)
    }
  }

  return (
    <div className="@container flex flex-col">
      <h2 className="text-lg font-semibold text-gray-900">{formatSelectedDateTitle(selectedDate)}</h2>
      {events.length > 0 && <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-2">
        <p className="text-xs font-semibold text-brand-700">오늘의 학사일정</p>
        <ul className="mt-1 flex flex-col gap-0.5">{events.map((event, index) => <li key={index} className="text-sm text-brand-800">· {event.name} · {gradeScopeLabel(event)}</li>)}</ul>
      </div>}
      <div className="mt-4 flex flex-col gap-3 @3xl:flex-row @3xl:items-center @3xl:gap-6">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2" aria-label="선택한 날짜의 출결 현황">
        <span className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800">전체 {students.length}명</span>
        {(['출석', '결석', '지각', '조퇴', '결과'] as const).map((status) => {
          const count = status === '출석' ? students.length - dayEntries.length : dayEntries.filter(({ entry }) => entry.status === status).length
          return <span key={status} className={`rounded-lg border px-3 py-2 text-sm ${status === '출석' ? 'border-brand-200 bg-brand-50 text-brand-800' : count ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-gray-200 bg-white text-gray-500'}`}>{status} <strong className="ml-1">{count}</strong></span>
        })}
        </div>
        {showInput && <button type="button" disabled={loading || !students.length} onClick={() => openForm()} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-end rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 @3xl:self-auto" aria-expanded={formOpen}><span aria-hidden="true" className="text-lg leading-none">＋</span>출결 입력</button>}
      </div>
      {!showInput ? <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center">
        <p className="text-sm text-gray-600">이 날짜는 학사일정상 수업일이 아닌 것으로 보입니다. 필요하면 출결을 입력할 수 있습니다.</p>
        <button type="button" onClick={() => { setForceEnableInput(true); openForm() }} className="mt-3 min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm">이 날짜에도 출결 입력</button>
      </div> : <>
        {formOpen && <AttendanceInputForm key={`${selectedDate}-${formKey}`} selectedDate={selectedDate} students={students} entries={entries} eventsByDate={eventsByDate} initialEntry={editingEntry} allowSelectedDate={forceEnableInput} onClose={() => setFormOpen(false)} onSave={saveAttendanceRange} />}
      </>}
      {loading ? <p className="mt-4 text-sm text-gray-500">불러오는 중...</p> : <section className="mt-5" aria-labelledby="attendance-records-title">
        <h3 id="attendance-records-title" className="mb-2 text-sm font-semibold text-gray-900">당일 출결 기록 · {dayEntries.length}명</h3>
        {!dayEntries.length ? <p className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">등록된 출결 변동이 없습니다.</p> : <div className="space-y-2">
          {dayEntries.map(({ student, entry }) => <div key={entry.id} id={`student-row-${student.id}`} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-lg border border-gray-200 bg-white px-3 py-2 @3xl:grid-cols-[auto_minmax(0,1fr)_auto] @3xl:gap-x-5 ${student.id === highlightStudentId ? 'ring-2 ring-brand-500' : ''}`}>
            <div className="order-1 flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-sm tabular-nums text-gray-600">{student.number}번</span>
              <span className="min-w-0 truncate text-sm font-semibold text-gray-900" title={student.name}>{student.name}</span>
            </div>
            <div className="order-3 col-span-2 flex min-w-0 items-start gap-2 @3xl:order-2 @3xl:col-span-1 @3xl:items-center">
              <span className="shrink-0 whitespace-nowrap rounded-md bg-brand-50 px-2 py-1 text-sm font-medium text-brand-800">{entry.reason_category} {entry.status}</span>
              {entry.note && <span className="min-w-0 flex-1 whitespace-pre-wrap py-1 text-sm text-gray-600 [overflow-wrap:anywhere]">{entry.note}</span>}
            </div>
            <div className="order-2 flex shrink-0 justify-self-end gap-1 @3xl:order-3">
              <button type="button" disabled={!showInput} onClick={() => openForm(entry)} aria-label={`${student.name} 출결 수정`} className="min-h-11 rounded-lg px-3 text-sm text-brand-700 hover:bg-brand-50 disabled:opacity-50">수정</button>
              <button type="button" onClick={() => { setDeleteError(''); setDeletingEntry(entry) }} aria-label={`${student.name} 출결 삭제`} className="min-h-11 rounded-lg px-3 text-sm text-red-700 hover:bg-red-50">삭제</button>
            </div>
          </div>)}
        </div>}
      </section>}
      {deletingEntry && <>
        <AttendanceDeleteConfirmModal studentName={students.find((student) => student.id === deletingEntry.student_id)?.name ?? '선택한 학생'} date={deletingEntry.date} status={deletingEntry.status} deleting={deleting} onCancel={() => setDeletingEntry(null)} onConfirm={deleteRecord} />
        {deleteError && <p role="alert" className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{deleteError}</p>}
      </>}
    </div>
  )
}
