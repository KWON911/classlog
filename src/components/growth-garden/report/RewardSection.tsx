import { useState } from 'react'
import { Gift, Trash2 } from 'lucide-react'
import { Modal } from '../../Modal'
import { ConfirmDialog } from '../../ConfirmDialog'
import {
  CLASS_REWARD_PRESETS,
  CUSTOM_REWARD_LABEL,
  STUDENT_REWARD_PRESETS,
} from '../../../lib/growth-garden/constants'
import { yyyymmddDash } from '../../../lib/utils/date-utils'
import type { NewReward } from '../../../lib/growth-garden/services/types'
import type { Reward, RewardScope } from '../../../lib/types'
import type { YearMonth } from '../../../lib/growth-garden/monthlyReport'

type RewardSectionProps = {
  scope: RewardScope
  yearMonth: YearMonth
  rewards: Reward[]
  /** 개인 보상일 때만 필요 */
  studentId?: string
  studentName?: string
  loading: boolean
  saving: boolean
  onCreate: (input: NewReward) => Promise<{ error?: string } | { data: Reward }>
  onDelete: (id: string) => void
}

/**
 * 월별 보상 지급/기록.
 *
 * 보상은 성장 포인트와 완전히 분리돼 있다 — 지급해도, 지워도 학생 점수는 그대로다.
 * 그 점을 교사가 헷갈리지 않도록 화면에도 한 줄로 적어 둔다.
 */
export function RewardSection({
  scope,
  yearMonth,
  rewards,
  studentId,
  studentName,
  loading,
  saving,
  onCreate,
  onDelete,
}: RewardSectionProps) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState<Reward | null>(null)

  const isClass = scope === 'class'
  const presets = isClass ? CLASS_REWARD_PRESETS : STUDENT_REWARD_PRESETS
  const heading = isClass ? '학급 보상' : `${studentName ?? '학생'} 보상`

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {yearMonth.month}월 {heading}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">보상 기록은 성장 포인트에 영향을 주지 않습니다.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-700 active:scale-[0.96]"
        >
          <Gift size={16} aria-hidden="true" />
          {isClass ? '학급 보상하기' : '개인 보상하기'}
        </button>
      </div>

      {loading && <p className="py-6 text-center text-sm text-gray-500">보상 기록을 불러오는 중...</p>}

      {!loading && rewards.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
          이번 달에 지급한 보상이 아직 없어요.
        </p>
      )}

      {!loading && rewards.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rewards.map((reward) => (
            <li
              key={reward.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <Gift size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{reward.title}</p>
                <p className="text-xs text-gray-500">
                  {formatAwardedOn(reward.awarded_on)}
                  {reward.description && ` · ${reward.description}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleting(reward)}
                aria-label={`${reward.title} 보상 기록 삭제`}
                className="shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-rose-500"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <RewardModal
          scope={scope}
          yearMonth={yearMonth}
          presets={presets}
          studentId={studentId}
          studentName={studentName}
          saving={saving}
          onClose={() => setOpen(false)}
          onSubmit={async (input) => {
            const result = await onCreate(input)
            if (!('error' in result)) setOpen(false)
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="보상 기록 삭제"
          message={
            <>
              <span className="font-medium text-gray-900">{deleting.title}</span> 기록을 지울까요?
              <br />
              학생의 성장 포인트에는 영향을 주지 않습니다.
            </>
          }
          confirmLabel="삭제"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            onDelete(deleting.id)
            setDeleting(null)
          }}
        />
      )}
    </div>
  )
}

function RewardModal({
  scope,
  yearMonth,
  presets,
  studentId,
  studentName,
  saving,
  onClose,
  onSubmit,
}: {
  scope: RewardScope
  yearMonth: YearMonth
  presets: string[]
  studentId?: string
  studentName?: string
  saving: boolean
  onClose: () => void
  onSubmit: (input: NewReward) => void
}) {
  const [title, setTitle] = useState(presets[0])
  const [customTitle, setCustomTitle] = useState('')
  const [description, setDescription] = useState('')
  const [awardedOn, setAwardedOn] = useState(() => defaultAwardedOn(yearMonth))

  const isCustom = title === CUSTOM_REWARD_LABEL
  const finalTitle = isCustom ? customTitle.trim() : title
  const canSubmit = Boolean(finalTitle) && Boolean(awardedOn) && !saving

  return (
    <Modal
      title={scope === 'class' ? '학급 보상 지급' : `${studentName ?? '학생'} 보상 지급`}
      description={`${yearMonth.year}년 ${yearMonth.month}월 보상으로 기록됩니다.`}
      onClose={onClose}
      maxWidthClassName="max-w-md"
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">보상 이름</p>
          <div className="flex flex-wrap gap-2">
            {[...presets, CUSTOM_REWARD_LABEL].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTitle(option)}
                aria-pressed={title === option}
                className={`h-10 rounded-full border px-3.5 text-sm transition-colors ${
                  title === option
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
              value={customTitle}
              onChange={(event) => setCustomTitle(event.target.value)}
              placeholder="보상 이름을 입력하세요"
              aria-label="보상 이름 직접 입력"
              className="mt-2.5 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          )}
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          설명 (선택)
          <input
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="예: 이번 달 정리정돈을 잘해서"
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
                scope,
                student_id: scope === 'student' ? (studentId ?? null) : null,
                year: yearMonth.year,
                month: yearMonth.month,
                title: finalTitle,
                description: description.trim() || null,
                awarded_on: awardedOn,
              })
            }
            className="inline-flex h-12 flex-[2] items-center justify-center gap-1.5 rounded-lg bg-brand-600 text-base font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Gift size={18} aria-hidden="true" />
            {saving ? '저장하는 중...' : '보상 기록하기'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** 보고 있는 달이 이번 달이면 오늘, 지난달이면 그달 1일을 기본값으로 둔다. */
function defaultAwardedOn({ year, month }: YearMonth): string {
  const today = new Date()
  if (today.getFullYear() === year && today.getMonth() + 1 === month) return yyyymmddDash(today)
  return yyyymmddDash(new Date(year, month - 1, 1))
}

function formatAwardedOn(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return `${month}월 ${day}일`
}
