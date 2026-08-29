import { useMemo, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  BEE_DURATION_RANGE,
  FLIGHT_DURATION_RANGE,
  FLIGHT_PATHS,
  FLYER_SIZE_RANGE,
  PETAL_DURATION_RANGE,
} from '../../lib/growth-garden/constants'
import type { GardenEnvironment } from '../../lib/growth-garden/environment'
import { useElementSize } from '../../lib/hooks/useElementSize'
import { Butterfly } from './Butterfly'
import { FallingPetal } from './FallingPetal'

type GardenAmbientLayerProps = {
  environment: GardenEnvironment
}

const PETAL_COLORS = ['#f5a8c6', '#f8c9dc', '#ffd9a8']

/** 결정적 의사난수 — 같은 인덱스는 항상 같은 값이라 리렌더에도 개체가 순간이동하지 않는다. */
function noise(seed: number): number {
  const value = Math.sin(seed * 78.233) * 43758.5453
  return value - Math.floor(value)
}

function between(range: { min: number; max: number }, ratio: number): number {
  return range.min + (range.max - range.min) * ratio
}

/**
 * 정원 위에 겹치는 자연 애니메이션 레이어 — 나비·벌·꽃잎·햇빛.
 *
 * 개체 수는 학급 정원 단계(GARDEN_ENVIRONMENT_STAGES)가 정하고, 개체별 경로·속도·
 * 크기·지연은 인덱스 기반 결정적 난수라 렌더마다 바뀌지 않는다.
 * 레이어 전체가 pointer-events: none이라 식물 클릭·이름 확인을 막지 않는다.
 */
export function GardenAmbientLayer({ environment }: GardenAmbientLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null)
  const size = useElementSize(layerRef)
  const prefersReducedMotion = useReducedMotion()
  const { current } = environment

  const flyers = useMemo(() => {
    const items: Array<{
      key: string
      variant: 'butterfly' | 'bee'
      path: ReadonlyArray<readonly [number, number]>
      sizePx: number
      durationSec: number
      delaySec: number
    }> = []

    for (let i = 0; i < current.butterflyCount; i += 1) {
      const seed = i + 3
      items.push({
        key: `butterfly-${i}`,
        variant: 'butterfly',
        path: FLIGHT_PATHS[i % FLIGHT_PATHS.length],
        sizePx: between(FLYER_SIZE_RANGE, noise(seed)),
        durationSec: between(FLIGHT_DURATION_RANGE, noise(seed * 1.7)),
        delaySec: noise(seed * 2.3) * 6,
      })
    }

    for (let i = 0; i < current.beeCount; i += 1) {
      const seed = i + 41
      items.push({
        key: `bee-${i}`,
        variant: 'bee',
        // 나비와 같은 경로를 쓰되 순서를 어긋나게 골라 겹쳐 다니지 않게 한다.
        path: FLIGHT_PATHS[(i + 2) % FLIGHT_PATHS.length],
        sizePx: between(FLYER_SIZE_RANGE, noise(seed)) * 0.7,
        durationSec: between(BEE_DURATION_RANGE, noise(seed * 1.3)),
        delaySec: 2 + noise(seed * 2.9) * 5,
      })
    }

    return items
  }, [current.butterflyCount, current.beeCount])

  const petals = useMemo(
    () =>
      Array.from({ length: current.petalCount }, (_, i) => {
        const seed = i + 61
        return {
          key: `petal-${i}`,
          startRatio: 0.1 + noise(seed) * 0.8,
          driftPx: 18 + noise(seed * 1.9) * 34,
          sizePx: 8 + noise(seed * 2.7) * 4,
          durationSec: between(PETAL_DURATION_RANGE, noise(seed * 3.1)),
          delaySec: i * 3 + noise(seed * 1.3) * 6,
          color: PETAL_COLORS[i % PETAL_COLORS.length],
        }
      }),
    [current.petalCount],
  )

  const ready = size.width > 0 && size.height > 0

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[20px]"
    >
      {ready && (
        <>
          {/* 마지막 단계에서만 켜지는 햇빛 — 깜박이지 않고 아주 느리게 밝기만 오간다. */}
          {current.sparkle && !prefersReducedMotion && (
            <motion.div
              className="absolute -right-16 -top-16 h-64 w-64 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,240,190,0.55) 0%, rgba(255,240,190,0) 70%)',
              }}
              animate={{ opacity: [0.35, 0.6, 0.35] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          {flyers.map((flyer) => (
            <Butterfly
              key={flyer.key}
              path={flyer.path}
              containerWidth={size.width}
              containerHeight={size.height}
              sizePx={flyer.sizePx}
              durationSec={flyer.durationSec}
              delaySec={flyer.delaySec}
              variant={flyer.variant}
              still={Boolean(prefersReducedMotion)}
            />
          ))}

          {/* 꽃잎과 햇빛은 reduced motion에서 아예 띄우지 않는다(정보 전달과 무관한 장식). */}
          {!prefersReducedMotion &&
            petals.map((petal) => (
              <FallingPetal
                key={petal.key}
                startRatio={petal.startRatio}
                driftPx={petal.driftPx}
                containerWidth={size.width}
                containerHeight={size.height}
                sizePx={petal.sizePx}
                durationSec={petal.durationSec}
                delaySec={petal.delaySec}
                color={petal.color}
              />
            ))}
        </>
      )}
    </div>
  )
}
