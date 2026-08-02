import { useStudents } from '../lib/hooks/useStudents'
import { StudentListItem } from '../components/StudentListItem'

export function StudentListPage() {
  const { students, loading, error } = useStudents()

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">학급기록</h1>
      <p className="mb-4 text-sm text-gray-500">우리 반 학생 {students.length}명</p>

      {loading && <p className="text-sm text-gray-500">불러오는 중...</p>}
      {error && (
        <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {students.map((student) => (
          <StudentListItem key={student.id} student={student} />
        ))}
      </div>
    </div>
  )
}
