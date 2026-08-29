import { useEffect, useMemo, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Gift, Maximize2, Minimize2, X } from 'lucide-react'
import { PlantIllustration } from '../PlantIllustration'
import { GardenBackground } from '../GardenBackground'
import { GardenAmbientLayer } from '../GardenAmbientLayer'
import { useFullscreen } from '../../../lib/hooks/useFullscreen'
import { stageConfig } from '../../../lib/growth-garden/growth'
import {
  CELEBRATION_BUTTERFLIES,
  CELEBRATION_PETALS,
  CELEBRATION_REASON_COUNT,
} from '../../../lib/growth-garden/constants'
import type { GardenEnvironment } from '../../../lib/growth-garden/environment'
import type { ReasonTally } from '../../../lib/growth-garden/monthlyReport'
import type { GrowthStage } from '../../../lib/growth-garden/constants'
import type { MonthlyAward, Student } from '../../../lib/types'

type MonthlyAwardCelebrationProps = {
  award: MonthlyAward
  student: Student
  /** 월말 기준 성장 단계 — 축하 화면의 주인공 식물 */
  stage: GrowthStage
  /** 이번 달 자주 보인 긍정 행동 (벌점 사유는 넘기지 않는다) */
  topReasons: ReasonTally[]
  environment: GardenEnvironment
  onClose: () => void
}

/**
 * 학생 축하 화면 — 교사용 관리 정보는 하나도 두지 않는다.
 *
 * 정원 배경·나비·꽃잎·식물 SVG를 그대로 재사용하되, 주인공 식물만 화면 가운데에서
 * 크게 보이도록 한다. 순위(1등/1위) 표현은 쓰지 않는다 — 성장 자체를 축하하는 화면이다.
 * 등장 순서는 정원 → 어두워짐 → 식물 → 이름/수상명 → 축하 문구 → 성장 → 보상.
 */
export function MonthlyAwardCelebration({
  award,
  student,
  stage,
  topReasons,
  environment,
  onClose,
}: MonthlyAwardCelebrationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { isFullscreen, supported, toggle } = useFullscreen(containerRef)
  const prefersReducedMotion = useReducedMotion()

  // 축하 화면은 정원 단계와 무관하게 늘 나비 몇 마리와 꽃잎이 있게 한다.
  const celebrationEnvironment = useMemo<GardenEnvironment>(
    () => ({
      ...environment,
      current: {
        ...environment.current,
        butterflyCount: CELEBRATION_BUTTERFLIES,
        beeCount: 0,
        petalCount: CELEBRATION_PETALS,
        sparkle: true,
      },
    }),
    [environment],
  )

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // 전체화면일 때는 브라우저가 ESC로 전체화면만 풀어 주므로, 그때는 화면을 닫지 않는다.
      if (event.key === 'Escape' && !document.fullscreenElement) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  /** reduced motion이면 이동·확대 없이 fade만, 순서도 거의 동시에 나타나게 한다. */
  const step = (index: number) =>
    prefersReducedMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3, delay: index * 0.05 } }
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay: 0.5 + index * 0.55, ease: [0.22, 1, 0.36, 1] as const },
        }

  const reasons = topReasons.slice(0, CELEBRATION_REASON_COUNT)

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${student.name} ${award.title} 축하 화면`}
      className="fixed inset-0 z-50 overflow-hidden bg-[#eef7ee]"
    >
      <GardenBackground environment={celebrationEnvironment} />
      <GardenAmbientLayer environment={celebrationEnvironment} />

      {/* 주변을 아주 살짝 눌러 주인공 식물이 도드라지게 한다(어둡게가 아니라 뿌옇게). */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-white/35"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: prefersReducedMotion ? 0.2 : 0.9 }}
      />

      <div className="relative z-30 flex h-full flex-col items-center justify-center gap-3 px-6 py-8 text-center">
        {/* 주인공 식물 — 화면 높이에 따라 커진다(교실 프로젝터에서도 충분히 크게). */}
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: prefersReducedMotion ? 0.3 : 1, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: 'clamp(180px, 34vh, 420px)' }}
          className="w-full"
        >
          <PlantIllustration stage={stage} variant="ground" className="mx-auto h-full w-auto" />
        </motion.div>

        <motion.p
          {...step(0)}
          className="rounded-full bg-white/85 px-4 py-1.5 text-lg font-semibold text-brand-700 sm:text-xl"
        >
          🌸 {award.title}
        </motion.p>

        <motion.h1
          {...step(1)}
          className="text-[clamp(2.2rem,7vw,4.5rem)] font-bold leading-tight text-gray-900 drop-shadow-sm"
        >
          {student.name}
        </motion.h1>

        <motion.p {...step(2)} className="text-[clamp(1rem,2.2vw,1.5rem)] text-gray-700">
          이번 달에도 멋지게 성장했어요!
        </motion.p>

        <motion.div {...step(3)} className="flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-brand-600 px-4 py-1.5 text-lg font-bold tabular-nums text-white sm:text-xl">
            이번 달 성장 {formatSigned(award.monthly_growth)}
          </span>
          <span className="rounded-full bg-white/85 px-3 py-1.5 text-sm font-medium text-gray-700">
            {stageConfig(stage).label}
          </span>
        </motion.div>

        {reasons.length > 0 && (
          <motion.div {...step(4)} className="mt-1">
            <p className="text-sm text-gray-600">이번 달 빛난 모습</p>
            <ul className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
              {reasons.map((reason) => (
                <li
                  key={reason.reason}
                  className="rounded-full bg-white/85 px-3.5 py-1.5 text-[clamp(0.85rem,1.6vw,1.05rem)] text-gray-800"
                >
                  {reason.reason}
                  <span className="ml-1.5 font-semibold tabular-nums text-brand-700">{reason.count}회</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        <motion.div
          {...step(5)}
          className="mt-2 inline-flex flex-col items-center gap-1 rounded-2xl bg-white/90 px-5 py-3"
        >
          <p className="flex items-center gap-1.5 text-sm text-gray-500">
            <Gift size={16} aria-hidden="true" />이번 달 특별 보상
          </p>
          <p className="text-[clamp(1.1rem,2.6vw,1.8rem)] font-bold text-brand-700">{award.reward_title}</p>
          {award.reward_description && <p className="text-sm text-gray-600">{award.reward_description}</p>}
        </motion.div>
      </div>

      {/* 조작 버튼은 구석에 작게 — 축하 화면의 주인공을 가리지 않게 한다. */}
      <div className="absolute right-4 top-4 z-40 flex gap-2">
        {supported && (
          <button
            type="button"
            onClick={toggle}
            aria-pressed={isFullscreen}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white/90 px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-white"
          >
            {isFullscreen ? <Minimize2 size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}
            {isFullscreen ? '전체화면 종료' : '전체화면'}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="축하 화면 닫기"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white/90 text-gray-600 transition-colors hover:bg-white"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}
