import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStudents } from '../lib/hooks/useStudents'
import { useStudentRecords } from '../lib/hooks/useStudentRecords'
import { useAttendanceSummary } from '../lib/hooks/useAttendanceSummary'
import { StudentForm, type StudentFormValues } from '../components/StudentForm'
import { RecordForm, type RecordFormValues } from '../components/RecordForm'
import { RecordTimeline } from '../components/RecordTimeline'
import type { StudentRecord } from '../lib/types'

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
  const { summary: attendanceSummary } = useAttendanceSummary(id ?? '')

  const [editingStudent, setEditingStudent] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showRecordForm, setShowRecordForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<StudentRecord | null>(null)

  const student = students.find((s) => s.id === id)

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
      setEditingStudent(false)
    }
  }

  const handleDeleteStudent = async () => {
    if (!window.confirm('정말 이 학생을 삭제하시겠어요? 연결된 모든 생활기록도 함께 삭제됩니다.')) {
      return
    }
    const result = await deleteStudent(student.id)
    if (!result.error) {
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
      <Link to="/students" className="text-sm text-blue-600 underline">
        ← 명부로
      </Link>

      <div className="mt-3 mb-6 flex items-start justify-between">
        <h1 className="text-2xl font-semibold">
          {student.number}. {student.name}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="rounded border border-gray-300 px-3 py-1 text-sm"
          >
            {showDetails ? '닫기' : '상세정보 보기'}
          </button>
          <button
            onClick={() => setEditingStudent((v) => !v)}
            className="rounded border border-gray-300 px-3 py-1 text-sm"
          >
            {editingStudent ? '닫기' : '정보 수정'}
          </button>
          <button
            onClick={handleDeleteStudent}
            className="rounded border border-red-300 px-3 py-1 text-sm text-red-600"
          >
            학생 삭제
          </button>
        </div>
      </div>

      <p className="mb-6 text-sm text-gray-600">
        결석 {attendanceSummary.결석} · 지각 {attendanceSummary.지각} · 조퇴 {attendanceSummary.조퇴} · 결과{' '}
        {attendanceSummary.결과}
      </p>

      {studentsError && <p className="text-red-600">{studentsError}</p>}

      {showDetails && (
        <dl className="mb-6 grid grid-cols-2 gap-x-4 gap-y-2 rounded border border-gray-200 p-4 text-sm">
          <dt className="text-gray-500">출석번호</dt>
          <dd>{student.number}</dd>
          <dt className="text-gray-500">이름</dt>
          <dd>{student.name}</dd>
          <dt className="text-gray-500">성별</dt>
          <dd>{student.gender ?? '-'}</dd>
          <dt className="text-gray-500">생년월일</dt>
          <dd>{student.birthdate ?? '-'}</dd>
          <dt className="text-gray-500">본인 연락처</dt>
          <dd>{student.student_phone ?? '-'}</dd>
          <dt className="text-gray-500">주소</dt>
          <dd>{student.address ?? '-'}</dd>
          <dt className="text-gray-500">부 성명</dt>
          <dd>{student.father_name ?? '-'}</dd>
          <dt className="text-gray-500">부 연락처</dt>
          <dd>{student.father_phone ?? '-'}</dd>
          <dt className="text-gray-500">모 성명</dt>
          <dd>{student.mother_name ?? '-'}</dd>
          <dt className="text-gray-500">모 연락처</dt>
          <dd>{student.mother_phone ?? '-'}</dd>
          <dt className="text-gray-500">비상연락처</dt>
          <dd>{student.emergency_contact ?? '-'}</dd>
          <dt className="text-gray-500">비고</dt>
          <dd>{student.note ?? '-'}</dd>
        </dl>
      )}

      {editingStudent && (
        <div className="mb-6 rounded border border-gray-200 p-4">
          <StudentForm
            submitLabel="저장"
            initialValues={{
              number: student.number,
              name: student.name,
              gender: student.gender ?? '',
              birthdate: student.birthdate ?? '',
              student_phone: student.student_phone ?? '',
              address: student.address ?? '',
              father_name: student.father_name ?? '',
              father_phone: student.father_phone ?? '',
              mother_name: student.mother_name ?? '',
              mother_phone: student.mother_phone ?? '',
              emergency_contact: student.emergency_contact ?? '',
              note: student.note ?? '',
            }}
            onSubmit={handleUpdateStudent}
            onCancel={() => setEditingStudent(false)}
          />
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">생활기록 / 상담</h2>
        <button
          onClick={() => {
            setEditingRecord(null)
            setShowRecordForm((v) => !v)
          }}
          className="rounded bg-blue-600 px-3 py-2 text-sm text-white"
        >
          기록 추가
        </button>
      </div>

      {showRecordForm && (
        <div className="mb-4 rounded border border-gray-200 p-4">
          <RecordForm submitLabel="추가" onSubmit={handleAddRecord} onCancel={() => setShowRecordForm(false)} />
        </div>
      )}

      {editingRecord && (
        <div className="mb-4 rounded border border-gray-200 p-4">
          <RecordForm
            key={editingRecord.id}
            submitLabel="저장"
            initialValues={editingRecord}
            onSubmit={handleUpdateRecord}
            onCancel={() => setEditingRecord(null)}
          />
        </div>
      )}

      {loading && <p>불러오는 중...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <RecordTimeline
        records={records}
        onEdit={(record) => {
          setShowRecordForm(false)
          setEditingRecord(record)
        }}
        onDelete={deleteRecord}
      />
    </div>
  )
}
