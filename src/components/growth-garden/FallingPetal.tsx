import { motion } from 'framer-motion'

type FallingPetalProps = {
  /** 시작 가로 위치(0~1 비율) */
  startRatio: number
  /** 떨어지는 동안 좌우로 흔들리는 폭(px) */
  driftPx: number
  containerWidth: number
  containerHeight: number
  sizePx: number
  durationSec: number
  delaySec: number
  color: string
}

/**
 * 천천히 떨어지는 꽃잎 한 장.
 * 한 번에 1~3장만 띄우고(개수는 정원 단계 설정), 시작 위치·속도·흔들림 폭을
 * 개체마다 달리해 같은 궤적이 반복되지 않게 한다.
 */
export function FallingPetal({
  startRatio,
  driftPx,
  containerWidth,
  containerHeight,
  sizePx,
  durationSec,
  delaySec,
  color,
}: FallingPetalProps) {
  const startX = startRatio * containerWidth

  return (
    <motion.div
      className="absolute left-0 top-0"
      style={{ width: sizePx, height: sizePx }}
      initial={{ x: startX, y: -sizePx, opacity: 0, rotate: 0 }}
      animate={{
        x: [startX, startX + driftPx, startX - driftPx * 0.6, startX + driftPx * 0.3],
        y: [-sizePx, containerHeight * 0.35, containerHeight * 0.7, containerHeight + sizePx],
        rotate: [0, 60, 140, 220],
        opacity: [0, 0.75, 0.75, 0],
      }}
      transition={{
        duration: durationSec,
        delay: delaySec,
        repeat: Infinity,
        // 한 장이 떨어진 뒤 한참 쉬어야 "가끔 날리는" 느낌이 된다.
        repeatDelay: durationSec * 0.8,
        ease: 'easeInOut',
      }}
    >
      <svg viewBox="0 0 10 10" width="100%" height="100%" aria-hidden="true">
        <path d="M5 0 C 8.5 2.5 8.5 7 5 10 C 1.5 7 1.5 2.5 5 0 Z" fill={color} />
      </svg>
    </motion.div>
  )
}
