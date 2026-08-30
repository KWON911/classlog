import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus } from 'lucide-react'
import { Modal } from '../Modal'
import type { GrowthPointType, Student } from '../../lib/types'
import {
  CUSTOM_REASON_LABEL,
  DEFAULT_DEMERIT_REASON,
  DEFAULT_MERIT_REASON,
  DEFAULT_POINT_AMOUNT,
  DEMERIT_REASONS,
  MERIT_REASONS,
  POINT_AMOUNT_OPTIONS,
} from '../../lib/growth-garden/constants'
import { summarizeTargetNames } from '../../lib/growth-garden/bulkGrowth'

export type BehaviorModalTarget = {
  /**
   * 기록 대상. 한 명이면 개별 기록, 여러 명이면 선택 학생 일괄 기록이다.
   * 개별/일괄이 같은 입력 화면(점수·사유)을 쓰도록 한 배열로 받는다.
   */
  students: Student[]
  /** 모달을 열 때의 초기 종류 */
  type: GrowthPointType
  /**
   * true면 모달 안에서 상점/벌점을 바꿀 수 있다. 정원 보기처럼 종류를 고르지 않고
   * 식물만 눌러 들어온 경우에 쓴다(카드·상세는 이미 버튼으로 종류를 정하고 들어온다).
   */
  allowTypeChange?: boolean
}

type BehaviorPointModalProps = {
  target: BehaviorModalTarget
  saving: boolean
  onClose: () => void
  onSubmit: (type: GrowthPointType, amount: number, reason: string) => void
}

/**
 * 상점/벌점 기록 모달 — 카드와 상세 화면이 같은 컴포넌트를 쓴다.
 *
 * 수업 중 속도가 중요하므로 점수 1점과 첫 번째 사유가 미리 선택돼 있어,
 * 열자마자 '기록하기' 한 번으로 끝낼 수 있다. 점수·사유 문구는 전부
 * constants에서 오므로 이 파일에는 목록이 하드코딩돼 있지 않다.
 */
export function BehaviorPointModal({ target, saving, onClose, onSubmit }: BehaviorPointModalProps) {
  const { students, allowTypeChange = false } = target
  const student = students[0]
  const isBulk = students.length > 1
  const [type, setType] = useState<GrowthPointType>(target.type)
  const isMerit = type === 'merit'
  const reasons = isMerit ? MERIT_REASONS : DEMERIT_REASONS
  const [amount, setAmount] = useState(DEFAULT_POINT_AMOUNT)
  const [reason, setReason] = useState(isMerit ? DEFAULT_MERIT_REASON : DEFAULT_DEMERIT_REASON)
  const [customReason, setCustomReason] = useState('')

  function changeType(next: GrowthPointType) {
    setType(next)
    // 사유 프리셋이 종류별로 다르므로 전환 시 해당 종류의 기본 사유로 되돌린다.
    setReason(next === 'merit' ? DEFAULT_MERIT_REASON : DEFAULT_DEMERIT_REASON)
    setCustomReason('')
  }

  const isCustom = reason === CUSTOM_REASON_LABEL
  const finalReason = isCustom ? customReason.trim() : reason
  const canSubmit = Boolean(finalReason) && !saving

  return (
    <Modal
      title={
        isBulk
          ? `선택한 ${students.length}명 ${isMerit ? '상점' : '벌점'} 기록`
          : `${student.name} ${isMerit ? '상점' : '벌점'} 기록`
      }
      description={
        isBulk
          ? `${summarizeTargetNames(students.map((item) => item.name))} · 모두에게 같은 점수와 사유가 기록됩니다.`
          : allowTypeChange
            ? `${student.number}번 · 종류와 점수, 사유를 고르고 기록하세요.`
            : `${student.number}번 · 점수와 사유를 고르고 기록하세요.`
      }
      onClose={onClose}
      maxWidthClassName="max-w-md"
    >
      <div className="flex flex-col gap-5">
        {allowTypeChange && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => changeType('merit')}
              aria-pressed={isMerit}
              className={`h-11 rounded-lg border text-sm font-semibold transition-colors ${
                isMerit ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              상점
            </button>
            <button
              type="button"
              onClick={() => changeType('demerit')}
              aria-pressed={!isMerit}
              className={`h-11 rounded-lg border text-sm font-semibold transition-colors ${
                !isMerit ? 'border-rose-500 bg-rose-500 text-white' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              벌점
            </button>
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">점수</p>
          <div className="flex flex-wrap gap-2">
            {POINT_AMOUNT_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setAmount(option)}
                aria-pressed={amount === option}
                className={`h-11 min-w-14 rounded-full border px-4 text-sm font-semibold transition-colors ${
                  amount === option
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {isMerit ? '+' : '-'}
                {option}점
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">사유</p>
          <div className="flex flex-wrap gap-2">
            {[...reasons, CUSTOM_REASON_LABEL].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setReason(option)}
                aria-pressed={reason === option}
                className={`h-10 rounded-full border px-3.5 text-sm transition-colors ${
                  reason === option
                    ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700'
                    : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          {isCustom && (
            <input
              type="text"
              value={customReason}
              onChange={(event) => setCustomReason(event.target.value)}
              placeholder="사유를 입력하세요"
              aria-label="사유 직접 입력"
              className="mt-2.5 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onSubmit(type, amount, finalReason)}
            disabled={!canSubmit}
            className={`inline-flex h-12 flex-[2] items-center justify-center gap-1.5 rounded-lg text-base font-semibold text-white transition-[transform,background-color] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${
              isMerit ? 'bg-brand-600 hover:bg-brand-700' : 'bg-rose-500 hover:bg-rose-600'
            }`}
          >
            {isMerit ? <Plus size={18} aria-hidden="true" /> : <Minus size={18} aria-hidden="true" />}
            {saving
              ? '기록하는 중...'
              : isBulk
                ? `${students.length}명에게 ${isMerit ? '상점' : '벌점'} ${amount}점`
                : `${isMerit ? '상점' : '벌점'} ${amount}점 기록하기`}
          </button>
        </div>

        {/* 정원 보기는 식물을 눌러도 상세로 가지 않으므로 여기서 상세로 갈 길을 남긴다.
            일괄 기록에는 '그 학생'이 없으므로 링크를 두지 않는다. */}
        {allowTypeChange && !isBulk && (
          <Link
            to={`/growth-garden/${student.id}`}
            className="-mt-1 text-center text-sm font-medium text-brand-600 hover:underline"
          >
            {student.name} 성장 기록 자세히 보기
          </Link>
        )}
      </div>
    </Modal>
  )
}
