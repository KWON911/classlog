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
 *
 * 카드에서는 +/− 아이콘만 담은 작은 정사각 버튼이다(카드가 좁아 글자까지 넣으면 답답하다).
 * 색만으로 구분하지 않도록 모양이 다른 아이콘을 쓰고, 스크린리더·마우스오버용으로
 * aria-label과 title에는 '상점'/'벌점'을 그대로 둔다.
 */
export function PointActionButtons({ studentName, saving = false, onRequest, size = 'card' }: PointActionButtonsProps) {
  const isCard = size === 'card'
  // 카드에서는 폭을 늘리지 않고 아이콘 크기의 정사각 버튼만 둔다 — 카드가 이미 좁고,
  // 남는 가로는 진행 문구가 쓰는 편이 낫다.
  const base = isCard ? 'h-9 w-9 shrink-0' : 'h-12 flex-1 gap-1.5 text-base'
  const iconSize = isCard ? 18 : 18

  return (
    <div className={`flex items-center gap-1.5 ${isCard ? '' : 'w-full gap-2'}`}>
      <button
        type="button"
        disabled={saving}
        onClick={() => onRequest('demerit')}
        aria-label={`${studentName} 벌점 기록하기`}
        title="벌점"
        className={`${base} inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 font-semibold text-rose-600 transition-[transform,background-color] duration-150 hover:bg-rose-100 active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <Minus size={iconSize} aria-hidden="true" />
        {!isCard && '벌점'}
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={() => onRequest('merit')}
        aria-label={`${studentName} 상점 기록하기`}
        title="상점"
        className={`${base} inline-flex items-center justify-center rounded-lg bg-brand-600 font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-700 active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <Plus size={iconSize} aria-hidden="true" />
        {!isCard && '상점'}
      </button>
    </div>
  )
}
