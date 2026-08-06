import { Link } from 'react-router-dom'

const CARD_MIN_HEIGHT = 'min-h-[220px]'

export function UnsetState({ message }: { message: string }) {
  return (
    <div className={`flex ${CARD_MIN_HEIGHT} flex-col items-center justify-center gap-3 text-center`}>
      <p className="max-w-xs text-sm text-gray-500">{message}</p>
      <Link
        to="/students/manage"
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        정보관리로 이동
      </Link>
    </div>
  )
}

export function LoadingState() {
  return (
    <div className={`flex ${CARD_MIN_HEIGHT} items-center justify-center`}>
      <p className="text-sm text-gray-400">불러오는 중...</p>
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className={`flex ${CARD_MIN_HEIGHT} items-center justify-center`}>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={`flex ${CARD_MIN_HEIGHT} flex-col items-center justify-center gap-3 text-center`}>
      <p className="max-w-xs text-sm text-red-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        다시 시도
      </button>
    </div>
  )
}
