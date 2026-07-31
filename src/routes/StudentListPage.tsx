import { useMemo, useState } from 'react'
import { useStudents } from '../lib/hooks/useStudents'
import { StudentForm, type StudentFormValues } from '../components/StudentForm'
import { StudentListItem } from '../components/StudentListItem'

export function StudentListPage() {
  const { students, loading, error, addStudent } = useStudents()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const filtered = useMemo(
    () => students.filter((s) => s.name.includes(search.trim())),
    [students, search],
  )

  const handleAdd = async (values: StudentFormValues) => {
    const result = await addStudent({
      number: values.number,
      name: values.name,
      gender: values.gender || null,
      student_phone: values.student_phone || null,
      parent_phone: values.parent_phone || null,
    })
    if (!result.error) {
      setShowForm(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">학생 명부</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded bg-blue-600 px-3 py-2 text-white"
        >
          {showForm ? '닫기' : '학생 추가'}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 rounded border border-gray-200 p-4">
          <StudentForm submitLabel="추가" onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
        </div>
      )}

      <input
        type="text"
        placeholder="이름 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded border border-gray-300 px-3 py-2"
      />

      {loading && <p>불러오는 중...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="flex flex-col gap-2">
        {filtered.map((student) => (
          <StudentListItem key={student.id} student={student} />
        ))}
      </div>
    </div>
  )
}
