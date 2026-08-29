import { Link } from 'react-router-dom'
import type { Student, GrowthPointType } from '../../lib/types'
import type { GardenSummary } from '../../lib/growth-garden/growth'
import { stageProgress } from '../../lib/growth-garden/growth'
import { useGrowthSettings } from '../../lib/growth-garden/growthSettingsContext'
import { PlantIllustration, type PlantPulse } from './PlantIllustration'
import { StageProgressBar } from './StageProgressBar'
import { PointActionButtons } from './PointActionButtons'

type GardenStudentCardProps = {
  student: Student
  summary: GardenSummary
  pulse: PlantPulse | null
  saving?: boolean
  onRequestPoint: (student: Student, type: GrowthPointType) => void
}

/**
 * 정원의 화분 한 칸. 카드 자체가 "학생 한 명의 화분"처럼 보이도록
 * 위쪽은 하늘색 그라데이션, 아래쪽은 흰 정보 영역으로 나눈다.
 */
export function GardenStudentCard({ student, summary, pulse, saving = false, onRequestPoint }: GardenStudentCardProps) {
  // 단계 기준은 교사 설정을 따른다(모든 화면이 같은 기준을 쓰도록 한 곳에서 가져온다).
  const { personalStages } = useGrowthSettings()
  const progress = stageProgress(summary.score, personalStages)

  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] border border-gray-200 bg-white shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_2px_rgba(0,0,0,0.12)] transition-shadow hover:shadow-[0_2px_10px_rgba(0,0,0,0.10)]">
      <Link
        to={`/growth-garden/${student.id}`}
        aria-label={`${student.number}번 ${student.name} 성장 기록 열기`}
        className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <div className="relative bg-gradient-to-b from-sky-50 to-brand-50/60 px-3 pt-3">
          <span className="absolute left-2.5 top-2.5 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-white/85 px-1.5 text-xs font-bold text-brand-700">
            {student.number}
          </span>
          <span
            className="absolute right-2.5 top-2.5 z-10 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
            style={{ backgroundColor: progress.current.accent }}
          >
            {progress.current.label}
          </span>
          <PlantIllustration stage={summary.stage} pulse={pulse} className="mx-auto h-28 w-full sm:h-32" />
        </div>

        <div className="flex items-center justify-between gap-2 px-3 pt-2.5">
          <span className="min-w-0 truncate text-base font-semibold text-gray-900 group-hover:text-brand-700">
            {student.name}
          </span>
          <span className="shrink-0 text-sm font-bold tabular-nums text-brand-700">{summary.score}점</span>
        </div>
      </Link>

      <div className="px-3 pb-3 pt-2">
        <StageProgressBar progress={progress} />
        {/* 진행 문구와 기록 버튼을 한 줄에 — 카드 높이를 줄이고 남는 가로를 쓴다. */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[11px] text-gray-500">
            {progress.next ? `다음 성장까지 ${progress.remaining}점` : '마지막 단계까지 자랐어요'}
          </p>
          <PointActionButtons
            studentName={student.name}
            saving={saving}
            onRequest={(type) => onRequestPoint(student, type)}
          />
        </div>
      </div>
    </div>
  )
}
