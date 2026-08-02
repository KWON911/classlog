import { useMemo, useState } from 'react'
import { useStudents } from '../lib/hooks/useStudents'
import { StudentListItem } from '../components/StudentListItem'
import { fieldClass } from '../lib/ui/classNames'

export function StudentListPage() {
  const { students, loading, error } = useStudents()
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () => students.filter((s) => s.name.includes(search.trim())),
    [students, search],
  )

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-semibold text-gray-900">학급기록</h1>

      <input
        type="text"
        placeholder="이름 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={`mb-4 w-full ${fieldClass}`}
      />

      {loading && <p className="text-sm text-gray-500">불러오는 중...</p>}
      {error && (
        <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filtered.map((student) => (
          <StudentListItem key={student.id} student={student} />
        ))}
      </div>
    </div>
  )
}
