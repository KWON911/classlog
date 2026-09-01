import { useState } from 'react'
import { ArrowRight, Minus, Plus, Search, Sparkles } from 'lucide-react'
import { sectionCardClass } from '../../../lib/ui/classNames'
import { PlantIllustration } from '../PlantIllustration'
import { stageConfig } from '../../../lib/growth-garden/growth'
import { useGrowthSettings } from '../../../lib/growth-garden/growthSettingsContext'
import type { MonthlyGrowthRow, StudentMonthlyReport } from '../../../lib/growth-garden/monthlyReport'
import type { MonthlyAward, Student, Reward } from '../../../lib/types'
import type { NewReward } from '../../../lib/growth-garden/services/types'
import { ReasonSummary } from './ReasonSummary'
import { RewardSection } from './RewardSection'

type StudentMonthlyReportViewProps = {
  students: Student[]
  selectedId: string
  onSelect: (studentId: string) => void
  report: StudentMonthlyReport | null
  /** 이번 달 성장순 계산 결과 — 목록 정렬과 성장값 표시에 쓴다(교사용). */
  growthRows: MonthlyGrowthRow[]
  /** 선택한 학생이 이미 수상했다면 그 기록 */
  awardOfSelected?: MonthlyAward
  onAward: (student: Student, monthlyGrowth: number) => void
  rewards: Reward[]
  rewardsLoading: boolean
  rewardSaving: boolean
  onCreateReward: (input: NewReward) => Promise<{ error?: string } | { data: Reward }>
  onDeleteReward: (id: string) => void
}

type EntryFilter = 'all' | 'merit' | 'demerit'
type SortMode = 'number' | 'growth'

/** 개인 월간 리포트 — 성장 변화가 가장 먼저 보이도록 식물 비교를 맨 위에 둔다. */
export function StudentMonthlyReportView({
  students,
  selectedId,
  onSelect,
  report,
  growthRows,
  awardOfSelected,
  onAward,
  rewards,
  rewardsLoading,
  rewardSaving,
  onCreateReward,
  onDeleteReward,
}: StudentMonthlyReportViewProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<EntryFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('number')

  const growthById = new Map(growthRows.map((row) => [row.studentId, row]))

  const trimmed = query.trim().toLowerCase()
  const matched = trimmed
    ? students.filter(
        (student) => student.name.toLowerCase().includes(trimmed) || String(student.number).includes(trimmed),
      )
    : students

  // 성장순은 순수 모듈이 계산한 순서(동점 규칙 포함)를 그대로 따른다.
  const visibleStudents =
    sortMode === 'growth'
      ? growthRows
          .map((row) => matched.find((student) => student.id === row.studentId))
          .filter((student): student is Student => Boolean(student))
      : [...matched].sort((a, b) => a.number - b.number)

  const student = students.find((candidate) => candidate.id === selectedId)
  const entries = report
    ? report.entries.filter((entry) => filter === 'all' || entry.type === filter)
    : []

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* 학생 선택 — 검색 + 목록. 교실에서 번호로도 이름으로도 찾을 수 있게 한다.
          PC에서는 오른쪽 리포트 열과 높이를 맞춘다(self-start면 내용만큼만 차지해
          오른쪽보다 짧아 보였다). 다만 화면 높이를 넘지 않게 잘라 sticky가 살아 있게 하고,
          목록이 남는 공간을 채우며 안에서 스크롤되게 한다. */}
      <section className={`${sectionCardClass} flex flex-col lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]`}>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-600">학생 선택</h2>
        <div className="mb-2 flex h-8 overflow-hidden rounded-lg border border-gray-300 bg-white text-xs">
          {(['number', 'growth'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSortMode(option)}
              aria-pressed={sortMode === option}
              className={`flex-1 font-medium transition-colors ${
                sortMode === option ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {option === 'number' ? '번호순' : '성장순'}
            </button>
          ))}
        </div>
        <div className="mb-2 flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3">
          <Search size={16} className="shrink-0 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="이름 · 번호 검색"
            aria-label="학생 검색"
            className="w-full min-w-0 text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>
        <ul className="flex max-h-[360px] flex-col gap-1 overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1">
          {visibleStudents.map((candidate) => (
            <li key={candidate.id}>
              <button
                type="button"
                onClick={() => onSelect(candidate.id)}
                aria-pressed={candidate.id === selectedId}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                  candidate.id === selectedId
                    ? 'bg-brand-50 font-semibold text-brand-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="w-6 shrink-0 text-xs tabular-nums text-gray-400">{candidate.number}</span>
                <span className="min-w-0 flex-1 truncate">{candidate.name}</span>
                {/* 성장순으로 볼 때만 값을 함께 보여준다 — 평소엔 명단이 점수표처럼 보이지 않게. */}
                {sortMode === 'growth' && (
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-brand-700">
                    {formatSigned(growthById.get(candidate.id)?.monthlyGrowth ?? 0)}
                    {growthById.get(candidate.id)?.tied && (
                      <span className="ml-1 font-normal text-gray-400">공동</span>
                    )}
                  </span>
                )}
              </button>
            </li>
          ))}
          {visibleStudents.length === 0 && (
            <li className="px-2 py-4 text-center text-sm text-gray-500">일치하는 학생이 없습니다.</li>
          )}
        </ul>
      </section>

      <div className="flex flex-col gap-4">
        {!student || !report ? (
          <section className={`${sectionCardClass} py-16 text-center text-sm text-gray-500`}>
            학생을 선택하면 그 달의 성장 기록을 볼 수 있어요.
          </section>
        ) : (
          <>
            <section className={sectionCardClass}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {student.number}번 {student.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {report.yearMonth.year}년 {report.yearMonth.month}월 성장 리포트
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onAward(student, report.totals.netScore)}
                  className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-[transform,background-color] duration-150 active:scale-[0.96] ${
                    awardOfSelected
                      ? 'border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                      : 'bg-brand-600 text-white hover:bg-brand-700'
                  }`}
                >
                  <Sparkles size={16} aria-hidden="true" />
                  {awardOfSelected ? '수상 정보 수정' : '수상자로 선정'}
                </button>
              </div>

              {/* 월초 → 월말 식물 비교 */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-4 rounded-2xl bg-gradient-to-b from-sky-50 to-brand-50/60 px-4 py-4">
                <PlantStep label="월초" studentId={student.id} stage={report.cycleStart.currentStage} score={report.cycleStart.currentCyclePoint} />
                <ArrowRight size={22} className="text-brand-400" aria-hidden="true" />
                <PlantStep label="월말" studentId={student.id} stage={report.cycleEnd.currentStage} score={report.cycleEnd.currentCyclePoint} highlight />
              </div>
              {report.cycleTransition === 'completed' && <p className="mt-2 text-center text-sm font-medium text-brand-700">{report.cycleStart.currentCycleNumber}번째 식물 성장 완료 → {report.cycleEnd.currentCycleNumber}번째 식물 시작</p>}

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MiniTile label="이번 달 순 성장" value={formatSigned(report.totals.netScore)} tone="brand" />
                <MiniTile label="상점" value={`+${report.totals.meritScore}`} sub={`${report.totals.meritCount}회`} tone="brand" />
                <MiniTile label="벌점" value={`-${report.totals.demeritScore}`} sub={`${report.totals.demeritCount}회`} tone="rose" />
                <MiniTile label="기록" value={`${report.entries.length}건`} tone="gray" />
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className={sectionCardClass}>
                <ReasonSummary
                  title={`${student.name} 학생이 이번 달 많이 보여준 모습`}
                  tallies={report.meritReasons}
                  tone="merit"
                  emptyText="이번 달 상점 기록이 없어요."
                />
              </section>
              <section className={sectionCardClass}>
                <ReasonSummary
                  title="조금 더 노력할 부분"
                  tallies={report.demeritReasons}
                  tone="demerit"
                  emptyText="이번 달 벌점 기록이 없어요."
                />
              </section>
            </div>

            <section className={sectionCardClass}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  {report.yearMonth.month}월 기록 {report.entries.length > 0 && <span className="text-gray-400">({report.entries.length})</span>}
                </h3>
                <div className="flex h-9 overflow-hidden rounded-lg border border-gray-300 bg-white text-sm">
                  {(['all', 'merit', 'demerit'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFilter(option)}
                      aria-pressed={filter === option}
                      className={`px-3 font-medium transition-colors ${
                        filter === option ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {option === 'all' ? '전체' : option === 'merit' ? '상점' : '벌점'}
                    </button>
                  ))}
                </div>
              </div>

              {entries.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">해당하는 기록이 없어요.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {entries.map((entry) => {
                    const isMerit = entry.type === 'merit'
                    return (
                      <li
                        key={entry.id}
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
                          <p className="text-xs text-gray-400">{formatDay(entry.created_at)}</p>
                        </div>
                        <span className={`shrink-0 text-sm font-bold tabular-nums ${isMerit ? 'text-brand-600' : 'text-rose-500'}`}>
                          {isMerit ? '+' : '-'}
                          {entry.amount}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className={sectionCardClass}>
              <RewardSection
                scope="student"
                yearMonth={report.yearMonth}
                rewards={rewards}
                studentId={student.id}
                studentName={student.name}
                loading={rewardsLoading}
                saving={rewardSaving}
                onCreate={onCreateReward}
                onDelete={onDeleteReward}
              />
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function PlantStep({
  label,
  studentId,
  stage,
  score,
  highlight = false,
}: {
  label: string
  studentId: string
  stage: Parameters<typeof stageConfig>[0]
  score: number
  highlight?: boolean
}) {
  const { personalStages } = useGrowthSettings()
  const config = stageConfig(stage, personalStages)
  return (
    <div className="w-[120px] text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <PlantIllustration stage={stage} studentId={studentId} variant="ground" className="mx-auto h-24 w-full" />
      <p className={`text-sm font-semibold ${highlight ? 'text-brand-700' : 'text-gray-700'}`}>{config.label}</p>
      <p className="text-xs tabular-nums text-gray-500">{score}점</p>
    </div>
  )
}

function MiniTile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: 'brand' | 'rose' | 'gray' }) {
  const toneClass = tone === 'brand' ? 'text-brand-700' : tone === 'rose' ? 'text-rose-600' : 'text-gray-700'
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
      <p className={`text-lg font-bold tabular-nums ${toneClass}`}>{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  )
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

function formatDay(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(
    date,
  )
}
