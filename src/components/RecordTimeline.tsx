import { useMemo, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { RecordCategory, StudentRecord } from '../lib/types'
import { ConfirmDialog } from './ConfirmDialog'

const CATEGORIES: RecordCategory[] = ['생활지도', '학습', '진로', '학부모상담', '기타']

type RecordTimelineProps = {
  records: StudentRecord[]
  onEdit: (record: StudentRecord) => void
  onDelete: (id: string) => Promise<unknown> | void
}

function filterPillClass(active: boolean) {
  return `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
    active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
  }`
}

export function RecordTimeline({ records, onEdit, onDelete }: RecordTimelineProps) {
  const [filter, setFilter] = useState<RecordCategory | 'all'>('all')
  const [deleteTarget, setDeleteTarget] = useState<StudentRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = useMemo(
    () => (filter === 'all' ? records : records.filter((r) => r.category === filter)),
    [records, filter],
  )

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    await onDelete(deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')} className={filterPillClass(filter === 'all')}>
          전체
        </button>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setFilter(c)} className={filterPillClass(filter === c)}>
            {c}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-3">
        {filtered.map((record) => (
          <li key={record.id} className="rounded-[14px] border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-500">
                {record.record_date} · {record.category}
              </span>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => onEdit(record)}
                  aria-label="기록 수정"
                  title="기록 수정"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setDeleteTarget(record)}
                  aria-label="기록 삭제"
                  title="기록 삭제"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-gray-900">{record.content}</p>
          </li>
        ))}
        {filtered.length === 0 && <p className="text-sm text-gray-500">기록이 없습니다.</p>}
      </ul>

      {deleteTarget && (
        <ConfirmDialog
          title="생활기록 삭제"
          message={
            <>
              <span className="font-medium text-gray-900">
                {deleteTarget.record_date} · {deleteTarget.category}
              </span>{' '}
              기록을 삭제할까요?
              <br />
              삭제한 기록은 되돌릴 수 없습니다.
            </>
          }
          pending={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  )
}
