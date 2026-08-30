import { useState } from 'react'
import { summarizeTargetNames, TARGET_NAME_PREVIEW_LIMIT } from '../../../lib/growth-garden/bulkGrowth'
import type { GrowthPointType, Student } from '../../../lib/types'

type BulkConfirmMessageProps = {
  students: Student[]
  classSize: number
  type: GrowthPointType
  amount: number
  reason: string
}

/**
 * 일괄 지급 확인 창의 본문.
 *
 * 이름 목록 때문에 창이 길어지지 않도록 기본은 요약이고, '대상 보기'를 눌렀을 때만
 * 전체 명단을 펼친다(그때도 최대 높이를 두고 그 안에서 스크롤한다).
 */
export function BulkConfirmMessage({ students, classSize, type, amount, reason }: BulkConfirmMessageProps) {
  const [expanded, setExpanded] = useState(false)
  const isMerit = type === 'merit'
  const isWholeClass = students.length === classSize
  const names = students.map((student) => student.name)

  return (
    <div className="flex flex-col gap-2">
      <p>
        {isWholeClass ? (
          <>
            학급 전체 <span className="font-semibold text-gray-900">{students.length}명</span>에게
          </>
        ) : (
          <>
            선택한 <span className="font-semibold text-gray-900">{students.length}명</span>에게
          </>
        )}{' '}
        <span className={`font-semibold ${isMerit ? 'text-brand-700' : 'text-rose-600'}`}>
          {isMerit ? '상점' : '벌점'} {isMerit ? '+' : '-'}
          {amount}점
        </span>
        을 {isMerit ? '지급' : '적용'}할까요?
      </p>

      <dl className="rounded-lg bg-gray-50 px-3 py-2">
        <dt className="text-xs text-gray-500">사유</dt>
        <dd className="text-sm text-gray-800">{reason}</dd>
      </dl>

      <div>
        <p className="text-xs text-gray-500">대상</p>
        {expanded ? (
          <ul className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800">
            {students.map((student) => (
              <li key={student.id} className="tabular-nums">
                {student.number}번 {student.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-800">{summarizeTargetNames(names)}</p>
        )}
        {names.length > TARGET_NAME_PREVIEW_LIMIT && (
          <button
            type="button"
            onClick={() => setExpanded((previous) => !previous)}
            className="mt-1 text-xs font-medium text-brand-600 hover:underline"
          >
            {expanded ? '접기' : '대상 보기'}
          </button>
        )}
      </div>
    </div>
  )
}
