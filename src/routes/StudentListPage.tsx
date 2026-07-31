import { useMemo, useState } from 'react'
import { useStudents } from '../lib/hooks/useStudents'
import { StudentListItem } from '../components/StudentListItem'

export function StudentListPage() {
  const { students, loading, error } = useStudents()
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () => students.filter((s) => s.name.includes(search.trim())),
    [students, search],
  )

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">학생 명부</h1>

      <input
        type="text"
        placeholder="이름 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded border border-gray-300 px-3 py-2"
      />

      {loading && <p>불러오는 중...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {filtered.map((student) => (
          <StudentListItem key={student.id} student={student} />
        ))}
      </div>
    </div>
  )
}
