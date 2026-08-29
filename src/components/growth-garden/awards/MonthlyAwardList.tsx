import { useState } from 'react'
import { Pencil, Sparkles, Trash2, Tv } from 'lucide-react'
import { ConfirmDialog } from '../../ConfirmDialog'
import type { MonthlyAward, Student } from '../../../lib/types'
import type { YearMonth } from '../../../lib/growth-garden/monthlyReport'

type MonthlyAwardListProps = {
  yearMonth: YearMonth
  awards: MonthlyAward[]
  students: Student[]
  loading: boolean
  onCelebrate: (award: MonthlyAward) => void
  onEdit: (award: MonthlyAward) => void
  onDelete: (id: string) => void
}

/**
 * 이번 달 수상자 목록 — 교사가 이미 선정한 학생을 다시 확인하고,
 * 축하 화면을 띄우거나 수정·취소할 수 있다. 한 달에 여러 명이 있을 수 있다.
 */
export function MonthlyAwardList({
  yearMonth,
  awards,
  students,
  loading,
  onCelebrate,
  onEdit,
  onDelete,
}: MonthlyAwardListProps) {
  const [removing, setRemoving] = useState<MonthlyAward | null>(null)
  const nameOf = (studentId: string) => students.find((student) => student.id === studentId)

  return (
    <div>
      <div className="mb-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          <Sparkles size={16} className="text-amber-500" aria-hidden="true" />
          {yearMonth.month}월 수상자
        </h3>
        <p className="mt-0.5 text-xs text-gray-500">
          수상은 성장 포인트와 별개입니다. 선정·수정·취소해도 학생 점수는 변하지 않습니다.
        </p>
      </div>

      {loading && <p className="py-6 text-center text-sm text-gray-500">수상 기록을 불러오는 중...</p>}

      {!loading && awards.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
          아직 선정한 학생이 없어요. 개인 탭의 성장순에서 골라 보세요.
        </p>
      )}

      {!loading && awards.length > 0 && (
        <ul className="flex flex-col gap-2">
          {awards.map((award) => {
            const student = nameOf(award.student_id)
            return (
              <li
                key={award.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {student ? `${student.number}번 ${student.name}` : '(삭제된 학생)'}
                    <span className="ml-2 font-bold tabular-nums text-brand-700">
                      {formatSigned(award.monthly_growth)}
                    </span>
                  </p>
                  <p className="truncate text-xs text-gray-600">
                    {award.title} · 🎁 {award.reward_title}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!student}
                    onClick={() => student && onCelebrate(award)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Tv size={15} aria-hidden="true" />
                    특별 화면 보기
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(award)}
                    aria-label={`${student?.name ?? ''} 수상 정보 수정`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    <Pencil size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoving(award)}
                    aria-label={`${student?.name ?? ''} 수상 취소`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-rose-600"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {removing && (
        <ConfirmDialog
          title="수상 취소"
          message={
            <>
              <span className="font-medium text-gray-900">{nameOf(removing.student_id)?.name ?? '이 학생'}</span>의{' '}
              {removing.title} 수상을 취소할까요?
              <br />
              상벌점 기록과 성장 포인트에는 영향을 주지 않습니다.
            </>
          }
          confirmLabel="수상 취소"
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            onDelete(removing.id)
            setRemoving(null)
          }}
        />
      )}
    </div>
  )
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}
