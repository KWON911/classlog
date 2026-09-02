import { motion, useReducedMotion } from 'framer-motion'
import type { ClassGardenUnlock, DecorationType } from '../../lib/types'
import { GardenDecoration } from './GardenDecoration'

type GardenDecorationLayerProps = {
  unlocks: ClassGardenUnlock[]
  isFullscreen: boolean
  newlyUnlockedTypes: Set<DecorationType>
}

type DecorationSlot = {
  label: string
  left: number
  top: number
  normalSize: number
  fullscreenSize: number
}

/**
 * 식물 격자의 빈 가장자리만 쓰는 고정 위치. 같은 장식은 어느 보기에서도 같은 자리에
 * 남아 있어 다음 달에도 정원에 쌓인 성취를 알아보기 쉽다.
 */
const DECORATION_SLOTS: Record<DecorationType, DecorationSlot> = {
  stone_path: { label: '돌길', left: 6, top: 73, normalSize: 104, fullscreenSize: 146 },
  bench: { label: '정원 벤치', left: 82, top: 75, normalSize: 90, fullscreenSize: 126 },
  pond: { label: '작은 연못', left: 8, top: 58, normalSize: 106, fullscreenSize: 148 },
  birdhouse: { label: '새집', left: 88, top: 19, normalSize: 70, fullscreenSize: 102 },
  big_tree: { label: '큰 나무', left: 3, top: 9, normalSize: 118, fullscreenSize: 166 },
  bridge: { label: '작은 다리', left: 67, top: 61, normalSize: 102, fullscreenSize: 144 },
  fence: { label: '울타리', left: 42, top: 86, normalSize: 112, fullscreenSize: 156 },
  garden_lamp: { label: '정원등', left: 92, top: 43, normalSize: 58, fullscreenSize: 82 },
}

export function GardenDecorationLayer({ unlocks, isFullscreen, newlyUnlockedTypes }: GardenDecorationLayerProps) {
  const prefersReducedMotion = useReducedMotion()
  const types = [...new Set(unlocks.map((unlock) => unlock.decoration_type))]

  return (
    <div
      data-testid="garden-decoration-layer"
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden rounded-[20px]"
    >
      {types.map((type) => {
        const slot = DECORATION_SLOTS[type]
        const isNew = newlyUnlockedTypes.has(type) && !prefersReducedMotion
        const size = isFullscreen ? slot.fullscreenSize : slot.normalSize

        return (
          <motion.div
            key={type}
            data-testid={`garden-decoration-${type}`}
            role="img"
            aria-label={slot.label}
            className="absolute opacity-90"
            style={{ left: `${slot.left}%`, top: `${slot.top}%`, width: `${size}px`, height: `${size}px`, transform: 'translate(-50%, -50%)' }}
            initial={isNew ? { opacity: 0, scale: 0.72 } : false}
            animate={isNew ? { opacity: 0.9, scale: 1 } : undefined}
            transition={isNew ? { duration: 0.45, ease: 'easeOut' } : undefined}
          >
            <GardenDecoration type={type} />
          </motion.div>
        )
      })}
    </div>
  )
}
