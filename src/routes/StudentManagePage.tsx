import { useMemo, useState } from 'react'
import { useStudents } from '../lib/hooks/useStudents'
import { StudentForm, type StudentFormValues } from '../components/StudentForm'
import { ImportStudentsPanel } from '../components/ImportStudentsPanel'
import { SchoolSettingsSection } from '../components/manage/SchoolSettingsSection'

export function StudentManagePage() {
  const { students, error, addStudent, addStudents, deleteAllStudents } = useStudents()
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const existingNumbers = useMemo(() => new Set(students.map((s) => s.number)), [students])

  const handleAdd = async (values: StudentFormValues) => {
    const result = await addStudent({
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
      setShowForm(false)
    }
  }

  const handleDeleteAll = async () => {
    if (students.length === 0) return
    if (
      !window.confirm(
        `정말 전체 학생 ${students.length}명을 삭제하시겠어요? 연결된 모든 생활기록도 함께 삭제되며 되돌릴 수 없습니다.`,
      )
    ) {
      return
    }
    await deleteAllStudents()
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">정보관리</h1>

      <SchoolSettingsSection />

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-blue-600">학생 명단</h2>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => {
            setShowImport(false)
            setShowForm((v) => !v)
          }}
          className="rounded bg-blue-600 px-3 py-2 text-white"
        >
          {showForm ? '닫기' : '학생 추가'}
        </button>
        <button
          onClick={() => {
            setShowForm(false)
            setShowImport((v) => !v)
          }}
          className="rounded border border-gray-300 px-3 py-2"
        >
          {showImport ? '닫기' : 'CSV 가져오기'}
        </button>
        <button
          onClick={handleDeleteAll}
          className="rounded border border-red-300 px-3 py-2 text-sm text-red-600"
        >
          전체 삭제
        </button>
      </div>

      {showForm && (
        <div className="mb-4 rounded border border-gray-200 p-4">
          <StudentForm submitLabel="추가" onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {showImport && (
        <div className="mb-4 rounded border border-gray-200 p-4">
          <ImportStudentsPanel
            existingNumbers={existingNumbers}
            onImport={addStudents}
            onCancel={() => setShowImport(false)}
          />
        </div>
      )}
    </div>
  )
}
