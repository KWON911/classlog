import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Modal } from '../../Modal'
import {
  AWARD_REWARD_PRESETS,
  AWARD_TITLE_PRESETS,
  CUSTOM_REWARD_LABEL,
  defaultAwardTitle,
} from '../../../lib/growth-garden/constants'
import { yyyymmddDash } from '../../../lib/utils/date-utils'
import type { MonthlyAward, Student } from '../../../lib/types'
import type { YearMonth } from '../../../lib/growth-garden/monthlyReport'

export type AwardFormValues = {
  title: string
  reward_title: string
  reward_description: string | null
  awarded_on: string
}

type MonthlyAwardModalProps = {
  student: Student
  yearMonth: YearMonth
  monthlyGrowth: number
  /** 있으면 수정 모드 */
  award?: MonthlyAward
  saving: boolean
  onClose: () => void
  onSubmit: (values: AwardFormValues) => void
}

/**
 * 수상자 선정/수정 — 성장순 1위라고 자동으로 확정되지 않고, 교사가 이 창에서
 * 확인하고 저장해야 실제 수상 기록이 생긴다. 수상명은 기본값이 있지만 자유롭게 고칠 수 있다.
 */
export function MonthlyAwardModal({
  student,
  yearMonth,
  monthlyGrowth,
  award,
  saving,
  onClose,
  onSubmit,
}: MonthlyAwardModalProps) {
  const titlePresets = [defaultAwardTitle(yearMonth.month), ...AWARD_TITLE_PRESETS]
  const [title, setTitle] = useState(award?.title ?? titlePresets[0])
  const [rewardTitle, setRewardTitle] = useState(award?.reward_title ?? AWARD_REWARD_PRESETS[0])
  const [customReward, setCustomReward] = useState(
    award && !AWARD_REWARD_PRESETS.includes(award.reward_title) ? award.reward_title : '',
  )
  const [description, setDescription] = useState(award?.reward_description ?? '')
  const [awardedOn, setAwardedOn] = useState(award?.awarded_on ?? defaultAwardedOn(yearMonth))

  const rewardIsCustom = rewardTitle === CUSTOM_REWARD_LABEL || Boolean(customReward && !award)
  const finalReward = rewardTitle === CUSTOM_REWARD_LABEL ? customReward.trim() : rewardTitle
  const canSubmit = Boolean(title.trim()) && Boolean(finalReward) && Boolean(awardedOn) && !saving

  return (
    <Modal
      title={award ? `${student.name} 수상 정보 수정` : `${student.name} 수상자 선정`}
      description={`${yearMonth.year}년 ${yearMonth.month}월 · 이번 달 성장 ${formatSigned(monthlyGrowth)}`}
      onClose={onClose}
      maxWidthClassName="max-w-md"
    >
      <div className="flex flex-col gap-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="award-title">
            수상명
          </label>
          <input
            id="award-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {titlePresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setTitle(preset)}
                aria-pressed={title === preset}
                className={`h-9 rounded-full border px-3 text-sm transition-colors ${
                  title === preset
                    ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700'
                    : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">보상</p>
          <div className="flex flex-wrap gap-2">
            {[...AWARD_REWARD_PRESETS, CUSTOM_REWARD_LABEL].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRewardTitle(option)}
                aria-pressed={rewardTitle === option}
                className={`h-10 rounded-full border px-3.5 text-sm transition-colors ${
                  rewardTitle === option
                    ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700'
                    : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          {rewardIsCustom && (
            <input
              type="text"
              value={customReward}
              onChange={(event) => setCustomReward(event.target.value)}
              placeholder="보상 이름을 입력하세요"
              aria-label="보상 이름 직접 입력"
              className="mt-2.5 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          )}
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          보상 설명 (선택)
          <input
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="예: 다음 주 월요일에 사용"
            className="h-11 rounded-lg border border-gray-300 px-3 text-sm font-normal focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          지급 날짜
          <input
            type="date"
            value={awardedOn}
            onChange={(event) => setAwardedOn(event.target.value)}
            className="h-11 rounded-lg border border-gray-300 px-3 text-sm font-normal focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
          수상 기록은 상벌점·성장 포인트와 별개입니다. 선정하거나 취소해도 학생의 점수는 변하지 않습니다.
        </p>

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
            disabled={!canSubmit}
            onClick={() =>
              onSubmit({
                title: title.trim(),
                reward_title: finalReward,
                reward_description: description.trim() || null,
                awarded_on: awardedOn,
              })
            }
            className="inline-flex h-12 flex-[2] items-center justify-center gap-1.5 rounded-lg bg-brand-600 text-base font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles size={18} aria-hidden="true" />
            {saving ? '저장하는 중...' : award ? '수정하기' : '선정하기'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function defaultAwardedOn({ year, month }: YearMonth): string {
  const today = new Date()
  if (today.getFullYear() === year && today.getMonth() + 1 === month) return yyyymmddDash(today)
  // 지난달을 정리하는 경우엔 그달 말일을 기본값으로 둔다.
  return yyyymmddDash(new Date(year, month, 0))
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}
