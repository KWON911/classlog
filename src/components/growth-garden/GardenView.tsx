import { useMemo, useRef, type CSSProperties } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import type { Student } from '../../lib/types'
import type { GardenSummary } from '../../lib/growth-garden/growth'
import type { GardenEnvironment } from '../../lib/growth-garden/environment'
import { calculateGardenLayout } from '../../lib/growth-garden/gardenLayout'
import { useFullscreen } from '../../lib/hooks/useFullscreen'
import { useElementSize } from '../../lib/hooks/useElementSize'
import type { PlantPulse } from './PlantIllustration'
import { GardenPlot } from './GardenPlot'
import { GardenBackground } from './GardenBackground'
import { ClassGardenSummary } from './ClassGardenSummary'
import { GardenAmbientLayer } from './GardenAmbientLayer'
import { GardenDecorationLayer } from './GardenDecorationLayer'
import type { ClassGardenUnlock, DecorationType } from '../../lib/types'

type GardenViewProps = {
  /** 카드 보기와 같은 순서(번호순/점수순, 검색 결과)를 그대로 받는다. */
  students: Student[]
  summaryFor: (studentId: string) => GardenSummary
  pulseFor: (studentId: string) => PlantPulse | null
  isSaving: (studentId: string) => boolean
  /** 식물을 누르면 그 학생의 기록 모달을 연다(정원 보기에는 버튼을 두지 않는다). */
  onSelect: (student: Student) => void
  /** 학급 전체 성장으로 계산된 배경 환경 — 검색으로 걸러진 목록이 아니라 학급 전체 기준. */
  environment: GardenEnvironment
  /** 월이 바뀌어도 남아 있는 공동 목표 해금 장식. */
  unlocks: ClassGardenUnlock[]
  /** 이번 갱신에서 막 도달한 장식만 짧게 등장시킨다. */
  newlyUnlockedTypes: Set<DecorationType>
}

/**
 * 정원 보기 — 학급 전체가 하나의 화단 위에 심긴 장면.
 *
 * 자리 배치는 자유 배치가 아니라 계산된 열 수의 그리드다: 학생이 20~30명이어도
 * 레이아웃이 무너지지 않고, 카드 보기와 같은 순서를 유지해 교사가 학생을 찾기 쉽다.
 * 식물·이름 크기와 간격은 `calculateGardenLayout`이 그리드 영역 실측값과 학생 수로
 * 매번 계산하므로, 전체화면(교실 대형 화면)에서도 같은 구성이 그대로 커진다.
 *
 * 루트에 overflow-hidden을 두면 첫 줄 식물의 정보 말풍선이 잘린다 —
 * 둥근 모서리 클리핑은 배경 레이어(GardenBackground)가 자체적으로 처리한다.
 */
export function GardenView({
  students,
  summaryFor,
  pulseFor,
  isSaving,
  onSelect,
  environment,
  unlocks,
  newlyUnlockedTypes,
}: GardenViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gridAreaRef = useRef<HTMLDivElement>(null)
  const { isFullscreen, supported, error: fullscreenError, toggle } = useFullscreen(containerRef)
  const gridArea = useElementSize(gridAreaRef)

  const layout = useMemo(
    () =>
      calculateGardenLayout({
        width: gridArea.width,
        // 전체화면일 때만 높이를 넘긴다 — 일반 보기는 아래로 스크롤되므로 높이를
        // 제한하면 오히려 식물이 쓸데없이 작아진다.
        height: isFullscreen ? gridArea.height : undefined,
        studentCount: students.length,
        fullscreen: isFullscreen,
      }),
    [gridArea.width, gridArea.height, students.length, isFullscreen],
  )

  const gridStyle = {
    '--garden-columns': layout.columns,
    '--garden-gap': `${layout.gap}px`,
    '--garden-stagger': `${layout.stagger}px`,
    '--garden-plant-height': `${layout.plantHeight}px`,
    '--garden-name-size': `${layout.nameFontSize}px`,
  } as CSSProperties

  return (
    <div
      ref={containerRef}
      className={`relative rounded-[20px] border border-brand-100 ${
        isFullscreen ? 'flex h-full flex-col p-4 sm:p-6' : 'px-3 pb-8 pt-4 sm:px-5'
      }`}
    >
      <GardenBackground environment={environment} />
      <GardenDecorationLayer
        unlocks={unlocks}
        isFullscreen={isFullscreen}
        newlyUnlockedTypes={newlyUnlockedTypes}
      />
      {/* 나비·꽃잎 등 자연 애니메이션 — pointer-events: none이라 식물 클릭을 막지 않는다. */}
      <GardenAmbientLayer environment={environment} />

      <ClassGardenSummary
        environment={environment}
        hint={fullscreenError ?? (isFullscreen ? 'ESC 키로도 전체화면을 끝낼 수 있어요.' : undefined)}
        action={
          supported ? (
            <button
              type="button"
              onClick={toggle}
              aria-pressed={isFullscreen}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              {isFullscreen ? <Minimize2 size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}
              {isFullscreen ? '전체화면 종료' : '전체화면 보기'}
            </button>
          ) : null
        }
      />

      {/* 그리드가 실제로 쓸 수 있는 영역 — 이 박스를 실측해 식물 크기를 정한다.
          전체화면에서는 남는 높이를 전부 차지해 화면이 비어 보이지 않게 한다. */}
      <div ref={gridAreaRef} className={`relative z-10 ${isFullscreen ? 'flex min-h-0 flex-1 items-center' : ''}`}>
        <div className="garden-grid w-full" style={gridStyle}>
          {students.map((student) => (
            <GardenPlot
              key={student.id}
              student={student}
              summary={summaryFor(student.id)}
              pulse={pulseFor(student.id)}
              saving={isSaving(student.id)}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
