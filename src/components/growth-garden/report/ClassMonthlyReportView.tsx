import { ArrowRight } from 'lucide-react'
import { sectionCardClass } from '../../../lib/ui/classNames'
import type { ClassMonthlyReport } from '../../../lib/growth-garden/monthlyReport'
import { MonthlyGrowthChart } from './MonthlyGrowthChart'
import { ReasonSummary } from './ReasonSummary'
import { RewardSection } from './RewardSection'
import type { NewReward } from '../../../lib/growth-garden/services/types'
import type { Reward } from '../../../lib/types'

type ClassMonthlyReportViewProps = {
  report: ClassMonthlyReport
  rewards: Reward[]
  rewardsLoading: boolean
  rewardSaving: boolean
  onCreateReward: (input: NewReward) => Promise<{ error?: string } | { data: Reward }>
  onDeleteReward: (id: string) => void
}

/** 학급 월간 리포트 — 요약 → 정원 변화 → 추이 → 행동 → 보상 순서. */
export function ClassMonthlyReportView({
  report,
  rewards,
  rewardsLoading,
  rewardSaving,
  onCreateReward,
  onDeleteReward,
}: ClassMonthlyReportViewProps) {
  const { totals, garden } = report

  return (
    <div className="flex flex-col gap-4">
      <section className={sectionCardClass}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-600">이번 달 요약</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryTile label="이번 달 성장 포인트" value={formatSigned(totals.netScore)} tone="brand" big />
          <SummaryTile label="상점" value={`${totals.meritScore}점`} sub={`${totals.meritCount}회`} tone="brand" />
          <SummaryTile label="벌점" value={`${totals.demeritScore}점`} sub={`${totals.demeritCount}회`} tone="rose" />
          <SummaryTile
            label="기록된 학생"
            value={`${report.activeStudentCount}명`}
            sub={`전체 ${report.totalStudentCount}명`}
            tone="gray"
          />
        </div>
      </section>

      <section className={sectionCardClass}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-600">우리 반 정원 변화</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <GardenStageChip label="월초" stageLabel={garden.start.current.label} />
          <ArrowRight size={18} className="text-gray-400" aria-hidden="true" />
          <GardenStageChip label="월말" stageLabel={garden.end.current.label} highlight />
          <span className="text-sm text-gray-600">
            {garden.stageDelta > 0
              ? `이번 달 ${garden.stageDelta}단계 자랐어요.`
              : garden.stageDelta < 0
                ? `이번 달 ${Math.abs(garden.stageDelta)}단계 돌아갔어요.`
                : '이번 달에는 정원 단계가 그대로예요.'}
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          정원 단계는 학생 1인당 평균 성장 포인트로 계산합니다(현재 누적 {garden.end.totalScore}점).
        </p>
      </section>

      <section className={sectionCardClass}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-600">일별 기록 추이</h2>
        <MonthlyGrowthChart daily={report.daily} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={sectionCardClass}>
          <ReasonSummary
            title="이번 달 많이 나온 좋은 행동"
            description="우리 반에서 어떤 모습이 자주 보였는지 확인해 보세요."
            tallies={report.meritReasons}
            tone="merit"
            emptyText="아직 상점 기록이 없어요."
          />
        </section>
        <section className={sectionCardClass}>
          <ReasonSummary
            title="조금 더 노력할 부분"
            description="자주 나온 순서일 뿐, 학생을 비교하는 자료가 아닙니다."
            tallies={report.demeritReasons}
            tone="demerit"
            emptyText="이번 달에는 벌점 기록이 없어요."
          />
        </section>
      </div>

      <section className={sectionCardClass}>
        <RewardSection
          scope="class"
          yearMonth={report.yearMonth}
          rewards={rewards}
          loading={rewardsLoading}
          saving={rewardSaving}
          onCreate={onCreateReward}
          onDelete={onDeleteReward}
        />
      </section>
    </div>
  )
}

function SummaryTile({
  label,
  value,
  sub,
  tone,
  big = false,
}: {
  label: string
  value: string
  sub?: string
  tone: 'brand' | 'rose' | 'gray'
  big?: boolean
}) {
  const toneClass = tone === 'brand' ? 'text-brand-700' : tone === 'rose' ? 'text-rose-600' : 'text-gray-700'
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-3">
      <p className={`${big ? 'text-2xl' : 'text-xl'} font-bold tabular-nums ${toneClass}`}>{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  )
}

function GardenStageChip({ label, stageLabel, highlight = false }: { label: string; stageLabel: string; highlight?: boolean }) {
  return (
    <span
      className={`inline-flex flex-col rounded-xl border px-3 py-1.5 ${
        highlight ? 'border-brand-300 bg-brand-50' : 'border-gray-200 bg-white'
      }`}
    >
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{stageLabel}</span>
    </span>
  )
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}
