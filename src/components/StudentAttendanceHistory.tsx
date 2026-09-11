import type { AttendanceEntry, AttendanceStatus, Student } from '../lib/types'

type Props = {
  student: Student | undefined
  status: AttendanceStatus | undefined
  entries: AttendanceEntry[]
  loading: boolean
  error: string | null
}

export function StudentAttendanceHistory({ student, status, entries, loading, error }: Props) {
  if (!student) {
    return (
      <section className="rounded-[14px] border border-gray-200 bg-white p-5 text-center shadow-sm sm:p-6">
        <p className="text-sm text-gray-500">학생을 선택해 출결 이력을 확인하세요.</p>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-3xl rounded-[14px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-semibold text-gray-900">
        {student.name} · {status ? `${status} 이력` : '출결 이력'}
      </h2>
      <p className="mt-1 text-sm text-gray-500">전체 누적 {entries.length}건</p>

      {loading ? (
        <p className="py-8 text-center text-sm text-gray-500">불러오는 중...</p>
      ) : error ? (
        <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">등록된 {status} 이력이 없습니다.</p>
      ) : (
        <ul className="mt-5 divide-y divide-gray-100 border-y border-gray-100">
          {entries.map((entry) => (
            <li key={entry.id} className="py-3">
              <p className="font-medium text-gray-900">
                {entry.date} · {entry.reason_category}{entry.status}
              </p>
              {entry.note && <p className="mt-1 text-sm text-gray-600">{entry.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
