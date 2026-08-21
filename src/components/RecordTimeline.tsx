import { useMemo, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { RecordCategory, StudentRecord } from '../lib/types'
import { ConfirmDialog } from './ConfirmDialog'

const CATEGORIES: RecordCategory[] = ['생활지도', '학습', '진로', '학부모상담', '기타']

type RecordTimelineProps = {
  records: StudentRecord[]
  loading?: boolean
  onEdit: (record: StudentRecord) => void
  onDelete: (id: string) => Promise<unknown> | void
}

function filterPillClass(active: boolean) {
  return `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
    active ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
  }`
}

export function RecordTimeline({ records, loading = false, onEdit, onDelete }: RecordTimelineProps) {
  const [filter, setFilter] = useState<RecordCategory | 'all'>('all')
  const [deleteTarget, setDeleteTarget] = useState<StudentRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = useMemo(
    () => (filter === 'all' ? records : records.filter((r) => r.category === filter)),
    [records, filter],
  )

  const hasNoRecordsAtAll = records.length === 0
  const emptyTitle = hasNoRecordsAtAll
    ? '아직 등록된 생활기록이 없습니다.'
    : `"${filter}" 카테고리에 해당하는 기록이 없습니다.`
  const emptyHint = hasNoRecordsAtAll
    ? '위의 "기록 추가" 버튼을 눌러 첫 기록을 남겨보세요.'
    : '다른 카테고리를 선택하거나 위의 "기록 추가" 버튼으로 새 기록을 남겨보세요.'

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

      {filtered.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {filtered.map((record) => (
            <li key={record.id} className="rounded-[14px] border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-500">
                  {record.record_date} · {record.category}
                </span>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => onEdit(record)}
                    aria-label="기록 수정"
                    title="기록 수정"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
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
        </ul>
      ) : loading ? null : (
        <div className="flex flex-col items-center gap-2 rounded-[14px] border border-gray-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-medium text-gray-700">{emptyTitle}</p>
          <p className="text-sm text-gray-500">{emptyHint}</p>
        </div>
      )}

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
