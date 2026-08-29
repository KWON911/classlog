import { motion } from 'framer-motion'

export type FlyerVariant = 'butterfly' | 'bee'

type ButterflyProps = {
  /** 0~1 비율 좌표의 비행 경로 — 컨테이너 크기와 곱해 픽셀로 쓴다. */
  path: ReadonlyArray<readonly [number, number]>
  containerWidth: number
  containerHeight: number
  sizePx: number
  durationSec: number
  delaySec: number
  variant?: FlyerVariant
  /** true면 움직임 없이 한 자리에 조용히 앉아 있는다. */
  still?: boolean
}

const COLORS = {
  butterfly: { wing: '#f7b9d2', wingBack: '#e79ec0', body: '#7a6a5f' },
  bee: { wing: '#e8eef5', wingBack: '#d3dde8', body: '#e2b33c' },
}

/**
 * 정원 위를 천천히 지나가는 나비(또는 벌).
 *
 * 경로는 mount 시 props로 고정되므로 리렌더가 일어나도 위치가 튀지 않는다.
 * 날갯짓은 framer가 아니라 CSS 애니메이션(index.css)이다 — SVG `<g>`에 프레이머
 * transform을 걸면 크롬에서 그룹이 안 그려지는 문제를 이미 겪었기 때문.
 */
export function Butterfly({
  path,
  containerWidth,
  containerHeight,
  sizePx,
  durationSec,
  delaySec,
  variant = 'butterfly',
  still = false,
}: ButterflyProps) {
  const xs = path.map(([x]) => x * containerWidth)
  const ys = path.map(([, y]) => y * containerHeight)
  const colors = COLORS[variant]
  const height = sizePx * 0.86

  // 정지 모드(reduced motion)에서는 경로 중간 지점에 조용히 놓아 둔다.
  const middle = Math.floor(path.length / 2)

  return (
    <motion.div
      className={`gg-flyer absolute left-0 top-0 ${still ? '' : 'gg-flyer--animated'}`}
      style={{ width: sizePx, height }}
      initial={still ? { x: xs[middle], y: ys[middle], opacity: 0.85 } : { x: xs[0], y: ys[0], opacity: 0 }}
      animate={
        still
          ? { x: xs[middle], y: ys[middle], opacity: 0.85 }
          : {
              x: xs,
              y: ys,
              rotate: [0, -8, 5, -6, 0],
              opacity: [0, 0.9, 0.9, 0.9, 0],
            }
      }
      transition={
        still
          ? { duration: 0 }
          : { duration: durationSec, delay: delaySec, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }
      }
    >
      <svg viewBox="0 0 24 20" width="100%" height="100%" aria-hidden="true">
        <g className="gg-wing gg-wing--l">
          <ellipse cx="7" cy="7" rx="6" ry="5" fill={colors.wing} />
          <ellipse cx="8" cy="14" rx="4.4" ry="3.8" fill={colors.wingBack} />
        </g>
        <g className="gg-wing gg-wing--r">
          <ellipse cx="17" cy="7" rx="6" ry="5" fill={colors.wing} />
          <ellipse cx="16" cy="14" rx="4.4" ry="3.8" fill={colors.wingBack} />
        </g>
        <ellipse cx="12" cy="10.5" rx="1.3" ry="5.4" fill={colors.body} />
        {variant === 'bee' && (
          <>
            <rect x="10.7" y="8" width="2.6" height="1.5" rx="0.7" fill="#5c4a2e" />
            <rect x="10.7" y="11" width="2.6" height="1.5" rx="0.7" fill="#5c4a2e" />
          </>
        )}
      </svg>
    </motion.div>
  )
}
