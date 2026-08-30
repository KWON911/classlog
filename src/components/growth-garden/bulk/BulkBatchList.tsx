import { useMemo, useState } from 'react'
import { Layers, Undo2 } from 'lucide-react'
import { ConfirmDialog } from '../../ConfirmDialog'
import { groupBulkBatches, summarizeTargetNames, type BulkBatch } from '../../../lib/growth-garden/bulkGrowth'
import type { GrowthPointEntry, Student } from '../../../lib/types'

/** 목록이 길어지지 않도록 최근 것만 보여준다 — 취소는 방금 한 실수를 되돌리는 용도다. */
const VISIBLE_BATCH_LIMIT = 5

type BulkBatchListProps = {
  entries: GrowthPointEntry[]
  students: Student[]
  onCancelBatch: (batchId: string) => Promise<{ error?: string }>
}

/**
 * 최근 일괄 기록 묶음 — 한 줄에 한 작업.
 *
 * 기록 자체는 학생별로 흩어져 저장돼 있고, 이 목록은 batch_id로 다시 묶어 보여주는
 * 읽기 전용 뷰다(집계용 테이블을 따로 두지 않는다).
 */
export function BulkBatchList({ entries, students, onCancelBatch }: BulkBatchListProps) {
  const [canceling, setCanceling] = useState<BulkBatch | null>(null)
  const [pending, setPending] = useState(false)

  const batches = useMemo(() => groupBulkBatches(entries), [entries])
  const nameById = useMemo(() => new Map(students.map((student) => [student.id, student.name])), [students])

  if (batches.length === 0) return null

  function namesOf(batch: BulkBatch): string[] {
    return batch.studentIds.map((id) => nameById.get(id) ?? '(삭제된 학생)')
  }

  return (
    <section className="mt-6">
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
        <Layers size={15} className="text-gray-400" aria-hidden="true" />
        최근 일괄 기록
      </h2>

      <ul className="flex flex-col gap-1.5">
        {batches.slice(0, VISIBLE_BATCH_LIMIT).map((batch) => {
          const isMerit = batch.type === 'merit'
          const names = namesOf(batch)
          const isWholeClass = students.length > 0 && batch.studentIds.length === students.length

          return (
            <li
              key={batch.batchId}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-gray-200 bg-white px-3 py-2"
            >
              <span className="text-xs tabular-nums text-gray-500">{formatDate(batch.createdAt)}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  isMerit ? 'bg-brand-50 text-brand-700' : 'bg-rose-50 text-rose-600'
                }`}
              >
                {isMerit ? '상점 +' : '벌점 -'}
                {batch.amount}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-gray-800">{batch.reason}</span>
              <span className="text-xs text-gray-500">
                대상 {batch.studentIds.length}명{isWholeClass && ' · 학급 전체'}
                <span className="ml-1 hidden text-gray-400 sm:inline">({summarizeTargetNames(names)})</span>
              </span>
              <button
                type="button"
                onClick={() => setCanceling(batch)}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Undo2 size={13} aria-hidden="true" />
                일괄 지급 취소
              </button>
            </li>
          )
        })}
      </ul>

      {canceling && (
        <ConfirmDialog
          title="일괄 지급 취소"
          message={
            <>
              {canceling.studentIds.length}명의{' '}
              <span className="font-medium text-gray-900">
                {canceling.type === 'merit' ? '상점 +' : '벌점 -'}
                {canceling.amount}
              </span>{' '}
              기록을 취소할까요?
              <br />이 묶음의 기록만 지워지고 다른 기록은 그대로 남습니다. 학생 점수는 남은 기록으로 다시 계산됩니다.
            </>
          }
          confirmLabel="일괄 지급 취소"
          pendingLabel="취소하는 중..."
          pending={pending}
          onCancel={() => setCanceling(null)}
          onConfirm={async () => {
            setPending(true)
            const result = await onCancelBatch(canceling.batchId)
            setPending(false)
            if (!result.error) setCanceling(null)
          }}
        />
      )}
    </section>
  )
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}.${date.getDate()} ${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`
}
