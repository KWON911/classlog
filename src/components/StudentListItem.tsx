import { Link } from 'react-router-dom'
import type { Student } from '../lib/types'

export function StudentListItem({ student }: { student: Student }) {
  return (
    <Link
      to={`/students/${student.id}`}
      className="flex items-center gap-3 rounded-[10px] border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-blue-200 hover:bg-blue-50/60"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
        {student.number}
      </span>
      <span className="truncate font-medium text-gray-900">{student.name}</span>
    </Link>
  )
}
