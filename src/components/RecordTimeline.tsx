import { useMemo, useState } from 'react'
import type { RecordCategory, StudentRecord } from '../lib/types'

const CATEGORIES: RecordCategory[] = ['생활지도', '학습', '진로', '학부모상담', '기타']

type RecordTimelineProps = {
  records: StudentRecord[]
  onEdit: (record: StudentRecord) => void
  onDelete: (id: string) => void
}

export function RecordTimeline({ records, onEdit, onDelete }: RecordTimelineProps) {
  const [filter, setFilter] = useState<RecordCategory | 'all'>('all')

  const filtered = useMemo(
    () => (filter === 'all' ? records : records.filter((r) => r.category === filter)),
    [records, filter],
  )

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded px-3 py-1 text-sm ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          전체
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded px-3 py-1 text-sm ${filter === c ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-3">
        {filtered.map((record) => (
          <li key={record.id} className="rounded border border-gray-200 p-3">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>
                {record.record_date} · {record.category}
              </span>
              <div className="flex gap-2">
                <button onClick={() => onEdit(record)} className="underline">
                  수정
                </button>
                <button onClick={() => onDelete(record.id)} className="underline">
                  삭제
                </button>
              </div>
            </div>
            <p className="mt-1 whitespace-pre-wrap">{record.content}</p>
          </li>
        ))}
        {filtered.length === 0 && <p className="text-gray-500">기록이 없습니다.</p>}
      </ul>
    </div>
  )
}
