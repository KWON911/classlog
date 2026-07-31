import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStudents } from '../lib/hooks/useStudents'
import { useStudentRecords } from '../lib/hooks/useStudentRecords'
import { StudentForm, type StudentFormValues } from '../components/StudentForm'
import { RecordForm, type RecordFormValues } from '../components/RecordForm'
import { RecordTimeline } from '../components/RecordTimeline'
import type { StudentRecord } from '../lib/types'

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { students, error: studentsError, updateStudent, deleteStudent } = useStudents()
  const { records, loading, error, addRecord, updateRecord, deleteRecord } = useStudentRecords(id ?? '')

  const [editingStudent, setEditingStudent] = useState(false)
  const [showRecordForm, setShowRecordForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<StudentRecord | null>(null)

  const student = students.find((s) => s.id === id)

  if (!student) {
    return <p className="p-6">학생 정보를 불러오는 중이거나 존재하지 않습니다.</p>
  }

  const handleUpdateStudent = async (values: StudentFormValues) => {
    const result = await updateStudent(student.id, {
      number: values.number,
      name: values.name,
      gender: values.gender || null,
      student_phone: values.student_phone || null,
      parent_phone: values.parent_phone || null,
    })
    if (!result.error) {
      setEditingStudent(false)
    }
  }

  const handleDeleteStudent = async () => {
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
        <div>
          <h1 className="text-2xl font-semibold">
            {student.number}. {student.name}
          </h1>
          <p className="text-sm text-gray-500">
            본인 {student.student_phone ?? '-'} · 학부모 {student.parent_phone ?? '-'}
          </p>
        </div>
        <div className="flex gap-2">
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

      {studentsError && <p className="text-red-600">{studentsError}</p>}

      {editingStudent && (
        <div className="mb-6 rounded border border-gray-200 p-4">
          <StudentForm
            submitLabel="저장"
            initialValues={{
              number: student.number,
              name: student.name,
              gender: student.gender ?? '',
              student_phone: student.student_phone ?? '',
              parent_phone: student.parent_phone ?? '',
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
