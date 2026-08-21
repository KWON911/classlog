import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, Plus } from 'lucide-react'
import { useStudents } from '../lib/hooks/useStudents'
import { useStudentRecords } from '../lib/hooks/useStudentRecords'
import { useAttendanceSummary } from '../lib/hooks/useAttendanceSummary'
import { PageContainer } from '../components/PageContainer'
import { RecordForm, type RecordFormValues } from '../components/RecordForm'
import { RecordTimeline } from '../components/RecordTimeline'
import { primaryButtonClass, sectionCardClass } from '../lib/ui/classNames'
import { ATTENDANCE_STATUS_COLOR_CLASS } from '../lib/utils/attendanceStatusColors'
import type { AttendanceStatus, StudentRecord } from '../lib/types'

const ATTENDANCE_SUMMARY_LABELS: AttendanceStatus[] = ['결석', '지각', '조퇴', '결과']

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { students, loading: studentsLoading, error: studentsError } = useStudents()
  const { records, loading, error, addRecord, updateRecord, deleteRecord } = useStudentRecords(id ?? '')
  const { summary: attendanceSummary, error: attendanceError } = useAttendanceSummary(id ?? '')

  const [showRecordForm, setShowRecordForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<StudentRecord | null>(null)

  useEffect(() => {
    setShowRecordForm(false)
    setEditingRecord(null)
  }, [id])

  const student = students.find((s) => s.id === id)
  const currentIndex = students.findIndex((s) => s.id === id)

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
    <PageContainer size="standard" maxWidth="1200px">
      <button
        type="button"
        onClick={() => navigate('/students')}
        className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
      >
        ← 학생 목록으로 돌아가기
      </button>

      <div className="mt-3 mb-4 flex flex-col items-center gap-1">
        <div className="relative inline-block max-w-full">
          <select
            value={student.id}
            onChange={(e) => navigate(`/students/${e.target.value}`)}
            aria-label="학생 선택"
            className="w-full appearance-none truncate rounded-lg bg-transparent py-1 pl-8 pr-8 text-center text-2xl font-bold text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.number}. {s.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={20}
            aria-hidden="true"
            className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </div>
        <p className="text-xs text-gray-400">
          {currentIndex + 1} / {students.length}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {ATTENDANCE_SUMMARY_LABELS.map((status) => (
          <span
            key={status}
            className={`inline-flex h-[25px] items-center justify-center rounded-full px-2.5 text-[12px] font-semibold ${ATTENDANCE_STATUS_COLOR_CLASS[status]}`}
          >
            {status} {attendanceSummary[status]}
          </span>
        ))}
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
        loading={loading}
        onEdit={(record) => {
          setShowRecordForm(false)
          setEditingRecord(record)
        }}
        onDelete={deleteRecord}
      />
    </PageContainer>
  )
}
