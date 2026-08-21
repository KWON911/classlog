import { Link } from 'react-router-dom'
import type { Student } from '../lib/types'

type StudentListItemProps = {
  student: Student
  /** undefined면 배지를 그리지 않는다 — 집계가 아직 로딩 중이거나 실패한
   *  상태에서 "0건"이 잘못 보였다가 실제 값으로 바뀌는 깜빡임을 피한다. */
  recordCount?: number
}

export function StudentListItem({ student, recordCount }: StudentListItemProps) {
  return (
    <Link
      to={`/students/${student.id}`}
      title={student.name}
      aria-label={`${student.number}번 ${student.name} 학생 기록 보기`}
      className="flex h-[60px] min-w-0 items-center gap-2.5 rounded-[10px] border border-gray-200 bg-white px-4 transition-colors hover:border-brand-200 hover:bg-brand-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-1 active:border-brand-300 active:bg-brand-50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
        {student.number}
      </span>
      <span className="min-w-0 truncate text-base font-semibold text-gray-900">{student.name}</span>
      {typeof recordCount === 'number' && (
        <span className="ml-auto shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
          {recordCount}건
        </span>
      )}
    </Link>
  )
}
