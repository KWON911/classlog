import { Minus, Plus } from 'lucide-react'
import type { GrowthPointType } from '../../lib/types'

type PointActionButtonsProps = {
  studentName: string
  /** 저장 중이면 연타로 중복 요청이 나가지 않도록 잠근다. */
  saving?: boolean
  onRequest: (type: GrowthPointType) => void
  size?: 'card' | 'detail'
}

/**
 * 상점/벌점 기록을 여는 버튼 쌍. 누르면 점수·사유를 고르는 모달이 열린다.
 * 색만으로 구분하지 않도록 +/− 아이콘과 텍스트 라벨을 함께 둔다.
 */
export function PointActionButtons({ studentName, saving = false, onRequest, size = 'card' }: PointActionButtonsProps) {
  const base = size === 'card' ? 'h-10 flex-1 gap-1 text-sm' : 'h-12 flex-1 gap-1.5 text-base'

  return (
    <div className="flex w-full items-center gap-2">
      <button
        type="button"
        disabled={saving}
        onClick={() => onRequest('demerit')}
        aria-label={`${studentName} 벌점 기록하기`}
        className={`${base} inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 font-semibold text-rose-600 transition-[transform,background-color] duration-150 hover:bg-rose-100 active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <Minus size={16} aria-hidden="true" />
        벌점
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={() => onRequest('merit')}
        aria-label={`${studentName} 상점 기록하기`}
        className={`${base} inline-flex items-center justify-center rounded-lg bg-brand-600 font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-700 active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <Plus size={16} aria-hidden="true" />
        상점
      </button>
    </div>
  )
}
