import { Link } from 'react-router-dom'
import type { Student } from '../lib/types'

export function StudentListItem({ student }: { student: Student }) {
  return (
    <Link
      to={`/students/${student.id}`}
      className="flex items-center justify-between rounded border border-gray-200 px-4 py-3 hover:bg-gray-50"
    >
      <span className="font-medium">
        {student.number}. {student.name}
      </span>
      <span className="text-sm text-gray-500">
        부 {student.father_phone ?? '-'} · 모 {student.mother_phone ?? '-'}
      </span>
    </Link>
  )
}
