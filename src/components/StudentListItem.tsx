import { Link } from 'react-router-dom'
import type { Student } from '../lib/types'

export function StudentListItem({ student }: { student: Student }) {
  return (
    <Link
      to={`/students/${student.id}`}
      title={student.name}
      aria-label={`${student.number}번 ${student.name} 학생 기록 보기`}
      className="flex h-[60px] min-w-0 items-center gap-2.5 rounded-[10px] border border-gray-200 bg-white px-4 transition-colors hover:border-blue-200 hover:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-1 active:border-blue-300 active:bg-blue-50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
        {student.number}
      </span>
      <span className="min-w-0 truncate text-base font-semibold text-gray-900">{student.name}</span>
    </Link>
  )
}
