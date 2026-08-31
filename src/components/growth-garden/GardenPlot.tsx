import type { CSSProperties } from 'react'
import type { Student } from '../../lib/types'
import type { GardenSummary } from '../../lib/growth-garden/growth'
import { stageProgress } from '../../lib/growth-garden/growth'
import { useGrowthSettings } from '../../lib/growth-garden/growthSettingsContext'
import { PlantIllustration, type PlantPulse } from './PlantIllustration'
import { SWAY_DURATION_RANGE } from '../../lib/growth-garden/constants'

/**
 * 학생 id에서 뽑은 고정 값으로 흔들림 주기·지연을 정한다 — 모든 식물이 한 덩어리로
 * 같이 움직이지 않게 하면서, 리렌더마다 값이 바뀌어 튀는 일도 없게 한다.
 */
function swayStyle(studentId: string): CSSProperties {
  let hash = 0
  for (let i = 0; i < studentId.length; i += 1) hash = (hash * 31 + studentId.charCodeAt(i)) % 997
  const ratio = hash / 997
  const duration = SWAY_DURATION_RANGE.min + (SWAY_DURATION_RANGE.max - SWAY_DURATION_RANGE.min) * ratio
  return {
    animationDuration: `${duration.toFixed(2)}s`,
    animationDelay: `-${(ratio * duration).toFixed(2)}s`,
  }
}

type GardenPlotProps = {
  student: Student
  summary: GardenSummary
  pulse: PlantPulse | null
  saving?: boolean
  onSelect: (student: Student) => void
}

/**
 * 정원에 심긴 학생 한 명의 자리 — 식물 + 이름표.
 *
 * 정원 보기는 감상이 우선이라 버튼을 두지 않는다. 식물 자체가 버튼이어서
 * 누르면 상점/벌점 기록 모달이 열리고(종류도 모달 안에서 고른다), hover·포커스
 * 시에는 단계와 남은 점수를 말풍선으로만 보여준다.
 */
export function GardenPlot({ student, summary, pulse, saving = false, onSelect }: GardenPlotProps) {
  const { personalStages } = useGrowthSettings()
  const progress = stageProgress(summary.score, personalStages)

  return (
    <div className="group relative flex flex-col items-center">
      {/* 부가 정보 말풍선 — 여백은 margin이 아니라 padding으로 준다(margin이면 식물과
          말풍선 사이에 어느 쪽도 아닌 구간이 생겨 hover가 끊긴다). */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-30 w-max -translate-x-1/2 pb-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 shadow-[0_4px_14px_rgba(15,23,42,0.12)]">
          <p className="text-[11px] font-semibold text-gray-900">
            {student.number}번 {student.name}
            <span className="ml-1.5 font-bold tabular-nums" style={{ color: progress.current.accent }}>
              {summary.score}점
            </span>
          </p>
          <p className="text-[11px] text-gray-500">
            {progress.current.label}
            {progress.next ? ` · 다음까지 ${progress.remaining}점` : ' · 마지막 단계'}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => onSelect(student)}
        aria-label={`${student.number}번 ${student.name}, ${progress.current.label} ${summary.score}점 — 상점·벌점 기록하기`}
        className="flex w-full flex-col items-center rounded-xl px-1 pb-1.5 pt-2 transition-colors hover:bg-white/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {/* 크기는 GardenView가 화면·학생 수로 계산해 CSS 변수로 내려준다.
            흔들림은 식물에만 건다 — 이름표까지 움직이면 읽기 어려워진다. */}
        <span className="gg-sway block w-full" style={swayStyle(student.id)}>
          <PlantIllustration
            stage={summary.stage}
            studentId={student.id}
            pulse={pulse}
            variant="ground"
            className="h-[var(--garden-plant-height,80px)] w-full"
          />
        </span>
        <span className="mt-0.5 max-w-full truncate rounded-full bg-white/80 px-2 py-0.5 text-[length:var(--garden-name-size,12px)] font-semibold leading-snug text-gray-800">
          {student.name}
        </span>
      </button>
    </div>
  )
}
