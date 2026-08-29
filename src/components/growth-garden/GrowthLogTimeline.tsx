import { AnimatePresence, motion } from 'framer-motion'
import { Minus, Plus, Trash2 } from 'lucide-react'
import type { GrowthPointEntry } from '../../lib/types'
import { SHRINK_ANIMATION_MS } from '../../lib/growth-garden/constants'

type GrowthLogTimelineProps = {
  entries: GrowthPointEntry[]
  onDelete: (id: string) => void
}

/** 기록 내역 — 저장 구조(GrowthPointEntry)를 그대로 시간순으로 보여준다. */
export function GrowthLogTimeline({ entries, onDelete }: GrowthLogTimelineProps) {
  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-500">아직 기록이 없어요. 첫 상점을 기록해 보세요.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {entries.map((entry) => {
          const isMerit = entry.type === 'merit'
          return (
            <motion.li
              key={entry.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: SHRINK_ANIMATION_MS / 1000, ease: 'easeInOut' }}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  isMerit ? 'bg-brand-50 text-brand-600' : 'bg-rose-50 text-rose-500'
                }`}
              >
                {isMerit ? <Plus size={16} aria-hidden="true" /> : <Minus size={16} aria-hidden="true" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{entry.reason}</p>
                <p className="text-xs text-gray-400">{formatTimestamp(entry.created_at)}</p>
              </div>
              <span
                className={`shrink-0 text-sm font-bold tabular-nums ${isMerit ? 'text-brand-600' : 'text-rose-500'}`}
              >
                {isMerit ? '+' : '-'}
                {entry.amount}
              </span>
              <button
                type="button"
                onClick={() => onDelete(entry.id)}
                aria-label={`${entry.reason} 기록 삭제`}
                className="shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-rose-500"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
