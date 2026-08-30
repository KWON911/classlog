import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
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
  /** 선택 모드에서는 카드가 상세 링크가 아니라 선택 토글이 된다. */
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: (studentId: string) => void
}

/**
 * 정원의 화분 한 칸. 카드 자체가 "학생 한 명의 화분"처럼 보이도록
 * 위쪽은 하늘색 그라데이션, 아래쪽은 흰 정보 영역으로 나눈다.
 */
export function GardenStudentCard({
  student,
  summary,
  pulse,
  saving = false,
  onRequestPoint,
  selectable = false,
  selected = false,
  onToggleSelect,
}: GardenStudentCardProps) {
  // 단계 기준은 교사 설정을 따른다(모든 화면이 같은 기준을 쓰도록 한 곳에서 가져온다).
  const { personalStages } = useGrowthSettings()
  const progress = stageProgress(summary.score, personalStages)

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-[14px] border bg-white shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_2px_rgba(0,0,0,0.12)] transition-shadow hover:shadow-[0_2px_10px_rgba(0,0,0,0.10)] ${
        selected ? 'border-brand-500 ring-2 ring-brand-200' : 'border-gray-200'
      }`}
    >
      {/* 선택 모드에서는 같은 자리가 링크 대신 선택 토글이 된다 — 카드를 잘못 눌러
          상세로 빠져나가는 일이 없도록 Link 자체를 렌더하지 않는다. */}
      <Body
        selectable={selectable}
        selected={selected}
        student={student}
        onToggleSelect={onToggleSelect}
      >
        <div className="relative bg-gradient-to-b from-sky-50 to-brand-50/60 px-3 pt-3">
          <span className="absolute left-2.5 top-2.5 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-white/85 px-1.5 text-xs font-bold text-brand-700">
            {student.number}
          </span>
          {/* 색만으로 선택을 표현하지 않도록 체크 표시를 함께 둔다. */}
          {selectable && (
            <span
              aria-hidden="true"
              className={`absolute left-2.5 top-9 z-10 flex h-6 w-6 items-center justify-center rounded-md border-2 ${
                selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 bg-white/90 text-transparent'
              }`}
            >
              <Check size={14} strokeWidth={3} />
            </span>
          )}
          <span
            className="absolute right-2.5 top-2.5 z-10 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
            style={{ backgroundColor: progress.current.accent }}
          >
            {progress.current.label}
          </span>
          <PlantIllustration stage={summary.stage} pulse={pulse} className="mx-auto h-28 w-full sm:h-32" />
        </div>

        {/* 점수가 카드에서 가장 큰 글자다. leading-none이 없으면 24px 글자의 줄높이(32px)가
            이름이 만든 줄(24px)을 밀어내 카드가 8px 높아진다 — 그리드 열 수는 그대로 두고
            크기 대비만 준다. */}
        <div className="flex items-center justify-between gap-2 px-3 pt-2.5">
          <span className="min-w-0 truncate text-sm font-semibold text-gray-900 group-hover:text-brand-700">
            {student.name}
          </span>
          <span className="shrink-0 text-2xl font-extrabold leading-none tabular-nums text-brand-700">
            {summary.score}
            <span className="ml-0.5 text-xs font-semibold text-gray-400">점</span>
          </span>
        </div>
      </Body>

      <div className="px-3 pb-3 pt-2">
        <StageProgressBar progress={progress} />
        {/* 진행 문구와 기록 버튼을 한 줄에 — 카드 높이를 줄이고 남는 가로를 쓴다. */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[11px] text-gray-500">
            {progress.next ? `다음 성장까지 ${progress.remaining}점` : '마지막 단계까지 자랐어요'}
          </p>
          {/* 선택 모드에서는 개별 버튼 대신 하단 액션바로 기록한다 — 카드마다 버튼이
              남아 있으면 '선택 중'과 '지금 기록' 두 동작이 한 카드에 섞인다. */}
          {!selectable && (
            <PointActionButtons
              studentName={student.name}
              saving={saving}
              onRequest={(type) => onRequestPoint(student, type)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 카드 윗부분(번호·식물·이름·점수)의 껍데기.
 * 일반 모드에서는 상세로 가는 링크, 선택 모드에서는 선택 토글 버튼이 된다.
 */
function Body({
  selectable,
  selected,
  student,
  onToggleSelect,
  children,
}: {
  selectable: boolean
  selected: boolean
  student: Student
  onToggleSelect?: (studentId: string) => void
  children: React.ReactNode
}) {
  if (!selectable) {
    return (
      <Link
        to={`/growth-garden/${student.id}`}
        aria-label={`${student.number}번 ${student.name} 성장 기록 열기`}
        className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        {children}
      </Link>
    )
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={`${student.number}번 ${student.name} 선택`}
      onClick={() => onToggleSelect?.(student.id)}
      className="group block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
    >
      {children}
    </button>
  )
}
