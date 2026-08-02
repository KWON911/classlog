import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useStudents } from '../lib/hooks/useStudents'
import { useStudentRecords } from '../lib/hooks/useStudentRecords'
import { useAttendanceSummary } from '../lib/hooks/useAttendanceSummary'
import { StudentDetailCard } from '../components/StudentDetailCard'
import type { StudentFormValues } from '../components/StudentForm'
import { RecordForm, type RecordFormValues } from '../components/RecordForm'
import { RecordTimeline } from '../components/RecordTimeline'
import { ConfirmDialog } from '../components/ConfirmDialog'
import {
  dangerButtonClass,
  primaryButtonClass,
  secondaryActiveButtonClass,
  secondaryButtonClass,
  sectionCardClass,
} from '../lib/ui/classNames'
import { ATTENDANCE_STATUS_COLOR_CLASS } from '../lib/utils/attendanceStatusColors'
import type { AttendanceStatus, StudentRecord } from '../lib/types'

const ATTENDANCE_SUMMARY_LABELS: AttendanceStatus[] = ['결석', '지각', '조퇴', '결과']
const DETAIL_PANEL_ID = 'student-detail-panel'

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    students,
    loading: studentsLoading,
    error: studentsError,
    updateStudent,
    deleteStudent,
  } = useStudents()
  const { records, loading, error, addRecord, updateRecord, deleteRecord } = useStudentRecords(id ?? '')
  const { summary: attendanceSummary, error: attendanceError } = useAttendanceSummary(id ?? '')

  // showDetails intentionally persists across student navigation (spec: moving
  // to the next student while details are open should keep them open) — only
  // the per-student states below reset when `id` changes.
  const [showDetails, setShowDetails] = useState(false)
  const [detailEditMode, setDetailEditMode] = useState(false)
  const [detailFormDirty, setDetailFormDirty] = useState(false)
  const [showRecordForm, setShowRecordForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<StudentRecord | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingStudent, setDeletingStudent] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  useEffect(() => {
    setDetailEditMode(false)
    setDetailFormDirty(false)
    setShowRecordForm(false)
    setEditingRecord(null)
    setShowDeleteConfirm(false)
    setPendingAction(null)
  }, [id])

  useEffect(() => {
    if (!(detailEditMode && detailFormDirty)) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [detailEditMode, detailFormDirty])

  const student = students.find((s) => s.id === id)
  const currentIndex = students.findIndex((s) => s.id === id)
  const prevStudent = currentIndex > 0 ? students[currentIndex - 1] : null
  const nextStudent = currentIndex >= 0 && currentIndex < students.length - 1 ? students[currentIndex + 1] : null

  if (!student) {
    if (studentsLoading) {
      return <p className="p-6">불러오는 중...</p>
    }
    return (
      <div className="p-6">
        {studentsError && <p className="text-red-600">{studentsError}</p>}
        <p>{studentsError ? '학생 정보를 불러오지 못했습니다.' : '존재하지 않는 학생입니다.'}</p>
      </div>
    )
  }

  const hasUnsavedChanges = detailEditMode && detailFormDirty

  function runOrConfirm(action: () => void) {
    if (hasUnsavedChanges) {
      setPendingAction(() => action)
    } else {
      action()
    }
  }

  const handleUpdateStudent = async (values: StudentFormValues) => {
    const result = await updateStudent(student.id, {
      number: values.number,
      name: values.name,
      gender: values.gender || null,
      birthdate: values.birthdate || null,
      student_phone: values.student_phone || null,
      address: values.address || null,
      father_name: values.father_name || null,
      father_phone: values.father_phone || null,
      mother_name: values.mother_name || null,
      mother_phone: values.mother_phone || null,
      emergency_contact: values.emergency_contact || null,
      note: values.note || null,
    })
    if (!result.error) {
      setDetailEditMode(false)
      setDetailFormDirty(false)
    }
  }

  const handleDeleteStudent = async () => {
    setDeletingStudent(true)
    const result = await deleteStudent(student.id)
    setDeletingStudent(false)
    setShowDeleteConfirm(false)
    if (result.error) return

    if (nextStudent) {
      navigate(`/students/${nextStudent.id}`, { replace: true })
    } else if (prevStudent) {
      navigate(`/students/${prevStudent.id}`, { replace: true })
    } else {
      navigate('/students')
    }
  }

  const handleAddRecord = async (values: RecordFormValues) => {
    const result = await addRecord(values)
    if (!result.error) {
      setShowRecordForm(false)
    }
  }

  const handleUpdateRecord = async (values: RecordFormValues) => {
    if (!editingRecord) return
    const result = await updateRecord(editingRecord.id, values)
    if (!result.error) {
      setEditingRecord(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <button
        type="button"
        onClick={() => runOrConfirm(() => navigate('/students'))}
        className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
      >
        ← 학생 목록으로 돌아가기
      </button>

      <div className="mt-3 mb-4 grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={() => prevStudent && runOrConfirm(() => navigate(`/students/${prevStudent.id}`))}
          disabled={!prevStudent}
          aria-label="이전 학생 보기"
          className="flex h-10 min-w-10 shrink-0 items-center justify-center gap-1 rounded-lg border border-gray-300 px-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft size={18} />
          <span className="hidden sm:inline">이전 학생</span>
        </button>

        <div className="min-w-0 text-center">
          <h1 className="truncate text-2xl font-bold text-gray-900">
            {student.number}. {student.name}
          </h1>
          <p className="mt-0.5 text-xs text-gray-400">
            {currentIndex + 1} / {students.length}
          </p>
        </div>

        <button
          type="button"
          onClick={() => nextStudent && runOrConfirm(() => navigate(`/students/${nextStudent.id}`))}
          disabled={!nextStudent}
          aria-label="다음 학생 보기"
          className="flex h-10 min-w-10 shrink-0 items-center justify-center gap-1 rounded-lg border border-gray-300 px-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <span className="hidden sm:inline">다음 학생</span>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {ATTENDANCE_SUMMARY_LABELS.map((status) => (
          <span
            key={status}
            className={`inline-flex h-[25px] items-center justify-center rounded-full px-2.5 text-[12px] font-semibold ${ATTENDANCE_STATUS_COLOR_CLASS[status]}`}
          >
            {status} {attendanceSummary[status]}
          </span>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => runOrConfirm(() => setShowDetails((v) => !v))}
          aria-expanded={showDetails}
          aria-controls={DETAIL_PANEL_ID}
          className={showDetails ? secondaryActiveButtonClass : secondaryButtonClass}
        >
          {showDetails ? '상세정보 닫기' : '상세정보 보기'}
        </button>
        <button type="button" onClick={() => runOrConfirm(() => setShowDeleteConfirm(true))} className={dangerButtonClass}>
          학생 삭제
        </button>
      </div>

      {studentsError && (
        <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {studentsError}
        </p>
      )}
      {attendanceError && (
        <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {attendanceError}
        </p>
      )}

      {showDetails && (
        <StudentDetailCard
          student={student}
          panelId={DETAIL_PANEL_ID}
          editMode={detailEditMode}
          onStartEdit={() => setDetailEditMode(true)}
          onCancelEdit={() => {
            setDetailEditMode(false)
            setDetailFormDirty(false)
          }}
          onSubmit={handleUpdateStudent}
          onDirtyChange={setDetailFormDirty}
        />
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">생활기록 / 상담</h2>
        <button
          onClick={() => {
            setEditingRecord(null)
            setShowRecordForm((v) => !v)
          }}
          className={`inline-flex items-center gap-1.5 ${primaryButtonClass}`}
        >
          <Plus size={16} />
          기록 추가
        </button>
      </div>

      {showRecordForm && (
        <div className={`mb-4 ${sectionCardClass}`}>
          <RecordForm submitLabel="추가" onSubmit={handleAddRecord} onCancel={() => setShowRecordForm(false)} />
        </div>
      )}

      {editingRecord && (
        <div className={`mb-4 ${sectionCardClass}`}>
          <RecordForm
            key={editingRecord.id}
            submitLabel="저장"
            initialValues={editingRecord}
            onSubmit={handleUpdateRecord}
            onCancel={() => setEditingRecord(null)}
          />
        </div>
      )}

      {loading && <p className="text-sm text-gray-500">불러오는 중...</p>}
      {error && (
        <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <RecordTimeline
        records={records}
        onEdit={(record) => {
          setShowRecordForm(false)
          setEditingRecord(record)
        }}
        onDelete={deleteRecord}
      />

      {showDeleteConfirm && (
        <ConfirmDialog
          title="학생 삭제"
          message={
            <>
              <span className="font-medium text-gray-900">
                {student.number}. {student.name}
              </span>{' '}
              학생을 삭제할까요?
              <br />
              연결된 모든 생활기록도 함께 삭제되며 되돌릴 수 없습니다.
            </>
          }
          pending={deletingStudent}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteStudent}
        />
      )}

      {pendingAction && (
        <ConfirmDialog
          title="저장하지 않은 변경사항"
          message="저장하지 않은 변경사항이 있습니다. 변경 내용을 버리고 이동할까요?"
          confirmLabel="변경사항 버리고 이동"
          cancelLabel="계속 수정"
          onCancel={() => setPendingAction(null)}
          onConfirm={() => {
            const action = pendingAction
            setPendingAction(null)
            setDetailEditMode(false)
            setDetailFormDirty(false)
            action?.()
          }}
        />
      )}
    </div>
  )
}
