import { useMemo } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ENVIRONMENT_TRANSITION_MS } from '../../lib/growth-garden/constants'
import type { GardenEnvironment } from '../../lib/growth-garden/environment'

/**
 * 학급 전체 정원의 배경 — 학급 평균 성장에 따라 흙만 있던 땅이 잔디·풀·꽃이
 * 있는 정원으로 변한다.
 *
 * 배경은 어디까지나 보조라서 학생 식물보다 튀면 안 된다. 그래서
 * (1) 색 레이어는 불투명도만 애니메이션하고(그라디언트 자체를 바꾸면 전환이 튄다),
 * (2) 장식은 작고 옅게 깔며, (3) 위치는 인덱스 기반 결정적 값이라 리렌더마다
 * 자리가 바뀌지 않는다.
 */

type GardenBackgroundProps = {
  environment: GardenEnvironment
}

const COLORS = {
  soilFrom: '#f6f1e6',
  soilTo: '#e9dcc6',
  grassFrom: '#eef7ee',
  grassMid: '#dcecd2',
  grassTo: '#cbe3bd',
  bloomFrom: '#fff8f0',
  bloomTo: '#ffe6ee',
  tuft: '#7fb069',
  pebble: '#cfc4ae',
  flower: ['#f2a2c0', '#ffd166', '#c9a7e8'],
}

/** 결정적 의사난수 — 같은 인덱스는 항상 같은 값이라 배치가 흔들리지 않는다. */
function noise(seed: number): number {
  const value = Math.sin(seed * 127.1) * 43758.5453
  return value - Math.floor(value)
}

type Decoration = { key: string; left: number; top: number; scale: number; color?: string }

function buildDecorations(count: number, seedOffset: number, colors?: string[]): Decoration[] {
  return Array.from({ length: count }, (_, index) => {
    const seed = index + seedOffset
    return {
      key: `${seedOffset}-${index}`,
      left: 2 + noise(seed) * 94,
      top: 6 + noise(seed * 1.7) * 88,
      scale: 0.75 + noise(seed * 2.3) * 0.6,
      color: colors ? colors[index % colors.length] : undefined,
    }
  })
}

export function GardenBackground({ environment }: GardenBackgroundProps) {
  const prefersReducedMotion = useReducedMotion()
  const { current } = environment
  const duration = prefersReducedMotion ? 0 : ENVIRONMENT_TRANSITION_MS / 1000

  const tufts = useMemo(() => buildDecorations(current.tuftCount, 11), [current.tuftCount])
  const pebbles = useMemo(() => buildDecorations(current.pebbleCount, 57), [current.pebbleCount])
  const flowers = useMemo(() => buildDecorations(current.flowerCount, 91, COLORS.flower), [current.flowerCount])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[20px]" aria-hidden="true">
      {/* 흙 바탕 — 항상 깔린다. 0단계도 황폐하지 않게 따뜻한 베이지. */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(180deg, ${COLORS.soilFrom} 0%, ${COLORS.soilTo} 100%)` }}
      />

      {/* 잔디 — 단계가 오를수록 진해진다. */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${COLORS.grassFrom} 0%, ${COLORS.grassMid} 55%, ${COLORS.grassTo} 100%)`,
        }}
        initial={false}
        animate={{ opacity: current.grassOpacity }}
        transition={{ duration, ease: 'easeInOut' }}
      />

      {/* 꽃필 무렵의 따뜻한 색 — 상위 단계에서만 은은하게 얹힌다. */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${COLORS.bloomFrom} 0%, rgba(255,236,241,0.7) 55%, ${COLORS.bloomTo} 100%)`,
        }}
        initial={false}
        animate={{ opacity: current.bloomOpacity }}
        transition={{ duration, ease: 'easeInOut' }}
      />

      <AnimatePresence>
        {pebbles.map((item, index) => (
          <Decor key={`pebble-${item.key}`} item={item} index={index} duration={duration}>
            <ellipse cx="6" cy="4" rx="6" ry="3.4" fill={COLORS.pebble} />
          </Decor>
        ))}

        {tufts.map((item, index) => (
          <Decor key={`tuft-${item.key}`} item={item} index={index} duration={duration}>
            <path
              d="M6 14 C 5 9 4 6 2 3 C 5 4 6 7 6 10 C 6 7 7 4 10 3 C 8 6 7 9 7 14 Z"
              fill={COLORS.tuft}
            />
          </Decor>
        ))}

        {flowers.map((item, index) => (
          <Decor key={`flower-${item.key}`} item={item} index={index} duration={duration}>
            <path d="M6 14 L6 8" stroke={COLORS.tuft} strokeWidth="1.4" strokeLinecap="round" />
            {[0, 72, 144, 216, 288].map((angle) => (
              <ellipse key={angle} cx="6" cy="4" rx="1.9" ry="3.1" fill={item.color} transform={`rotate(${angle} 6 6.5)`} />
            ))}
            <circle cx="6" cy="6.5" r="1.5" fill="#ffd166" />
          </Decor>
        ))}
      </AnimatePresence>
    </div>
  )
}

function Decor({
  item,
  index,
  duration,
  children,
}: {
  item: Decoration
  index: number
  duration: number
  children: React.ReactNode
}) {
  return (
    <motion.svg
      viewBox="0 0 12 16"
      className="absolute"
      style={{
        left: `${item.left}%`,
        top: `${item.top}%`,
        width: `${16 * item.scale}px`,
        height: `${21 * item.scale}px`,
      }}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 0.55, scale: 1 }}
      exit={{ opacity: 0, scale: 0.4 }}
      transition={{ duration, delay: Math.min(index * 0.03, 0.4), ease: 'easeOut' }}
    >
      {children}
    </motion.svg>
  )
}
