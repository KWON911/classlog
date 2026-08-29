import { useEffect, useMemo } from 'react'
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import {
  GROW_ANIMATION_MS,
  SHRINK_ANIMATION_MS,
  SPARKLE_COUNT,
  type GrowthStage,
} from '../../lib/growth-garden/constants'

/**
 * 단계별 식물 일러스트 — 이미지 파일 없이 전부 SVG 패스로 그린다.
 *
 * 파트(줄기/떡잎/잎/봉오리/꽃)는 stage에 따라 조건부로 붙고, AnimatePresence가
 * 등장(상점)과 퇴장(벌점)을 각각 애니메이션한다. 전체 확대/축소 "펄스"는
 * 별도 컨트롤로 겹쳐 재생한다 — AnimatePresence를 살리려면 remount 대신
 * useAnimationControls를 써야 한다(remount하면 exit 애니메이션이 잘린다).
 */

export type PlantPulse = {
  direction: 'grow' | 'shrink'
  /** 같은 방향을 연속 기록해도 애니메이션이 다시 재생되도록 매번 바뀌는 값 */
  token: number
}

/**
 * 'pot'은 카드 보기(화분에 심긴 모습), 'ground'는 정원 보기(땅에 심긴 모습).
 * 줄기·잎·꽃과 애니메이션은 완전히 동일하고 바닥 표현만 달라진다 — 두 보기의
 * 식물이 같은 정원에서 자라는 같은 종처럼 보이게 하기 위함.
 */
export type PlantGround = 'pot' | 'ground'

type PlantIllustrationProps = {
  stage: GrowthStage
  pulse?: PlantPulse | null
  variant?: PlantGround
  className?: string
}

/** 단계별 줄기 끝 y좌표 (viewBox 0 0 120 120 기준, 아래가 큰 값) */
const STEM_TOP_Y: Record<GrowthStage, number> = {
  0: 100,
  1: 84,
  2: 74,
  3: 56,
  4: 46,
  5: 38,
  6: 32,
}

/** 흙 표면 y좌표 — 줄기·씨앗이 여기서 시작한다(화분 테두리 안쪽). */
const SOIL_Y = 96

const LEAF_PATH = 'M0 0 C 7 -11 21 -14 30 -5 C 21 6 7 9 0 0 Z'
const LEAF_VEIN_PATH = 'M2 0 C 10 -3 20 -4 27 -4.6'

/**
 * 색은 전부 단색 — SVG 그라디언트(paint server)는 인스턴스가 여러 개일 때
 * 참조가 끊겨 도형이 통째로 안 칠해지는 문제가 있어 쓰지 않는다.
 */
const COLORS = {
  soil: '#8b6647',
  soilShadow: '#6f5138',
  soilLight: '#a07a56',
  potBody: '#dc9b7c',
  potRim: '#eeb495',
  potShade: '#c9866a',
  stem: '#4a9c5e',
  leaf: '#57a95f',
  leafVein: '#7fc481',
  seed: '#6f4b32',
  seedHighlight: '#b98d66',
  bud: '#d98cb3',
  budLine: '#b9628f',
  petal: '#f2739a',
  flowerCenter: '#ffc861',
  sparkle: '#ffd66b',
}
const SPARKLE_PATH = 'M0 -5 Q 0.9 -0.9 5 0 Q 0.9 0.9 0 5 Q -0.9 0.9 -5 0 Q -0.9 -0.9 0 -5 Z'

const SPARKLE_POSITIONS = [
  { x: 26, y: 40 },
  { x: 94, y: 46 },
  { x: 38, y: 20 },
  { x: 84, y: 22 },
  { x: 60, y: 12 },
  { x: 18, y: 66 },
  { x: 102, y: 70 },
  { x: 60, y: 84 },
].slice(0, SPARKLE_COUNT)

export function PlantIllustration({ stage, pulse = null, variant = 'pot', className = '' }: PlantIllustrationProps) {
  const controls = useAnimationControls()
  const prefersReducedMotion = useReducedMotion()
  const stemTop = STEM_TOP_Y[stage]
  const pulseToken = pulse?.token

  useEffect(() => {
    if (!pulse) return
    if (prefersReducedMotion) {
      controls.set({ scale: 1 })
      return
    }
    if (pulse.direction === 'grow') {
      controls.start({
        scale: [1, 1.12, 1],
        transition: { duration: GROW_ANIMATION_MS / 1000, ease: [0.22, 1, 0.36, 1], times: [0, 0.45, 1] },
      })
    } else {
      controls.start({
        scale: [1, 0.9, 1],
        transition: { duration: SHRINK_ANIMATION_MS / 1000, ease: 'easeInOut', times: [0, 0.5, 1] },
      })
    }
    // token이 바뀔 때만 재생 — 같은 방향을 연속으로 눌러도 매번 다시 재생된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulseToken])

  // 잎 배치는 줄기 높이에 비례해 계산 — 단계별 좌표를 따로 하드코딩하지 않는다.
  const leaves = useMemo(() => buildLeaves(stage, stemTop), [stage, stemTop])
  const showSparkles = pulse?.direction === 'grow' && !prefersReducedMotion

  return (
    /* 전체 펄스(확대/축소)는 SVG의 <g>가 아니라 바깥 div에 건다 — <g>에 scale을 주면
       framer가 transform-box: fill-box를 함께 심는데, 크롬에서 그 그룹이 통째로
       그려지지 않는 문제가 있었다(형상은 그대로인데 화면에만 안 나옴). */
    <motion.div className={className} animate={controls} style={{ transformOrigin: '50% 80%' }}>
      <svg
        viewBox="0 0 120 120"
        role="img"
        aria-hidden="true"
        className="h-full w-full"
        style={{ overflow: 'visible' }}
      >
        {/* 바닥 — 단계와 무관하게 항상 그려진다. 화분(카드 보기)은 몸통 → 테두리 → 흙
            순서로 겹쳐 흙이 담긴 것처럼 보이게 하고, 정원 보기는 흙 두둑만 그린다. */}
        {variant === 'pot' ? (
          <>
            <path
              d="M30 104 L90 104 L83.5 117 Q82.5 119 80.5 119 L39.5 119 Q37.5 119 36.5 117 Z"
              fill={COLORS.potBody}
            />
            <path d="M74 104 L83.5 117 Q82.5 119 80.5 119 L72 119 Z" fill={COLORS.potShade} opacity="0.35" />
            <rect x="25" y="93" width="70" height="11" rx="5" fill={COLORS.potRim} />
            <ellipse cx="60" cy={SOIL_Y - 0.5} rx="31" ry="5.5" fill={COLORS.soil} />
            <ellipse cx="60" cy={SOIL_Y - 1.5} rx="26" ry="3.6" fill={COLORS.soilShadow} opacity="0.35" />
          </>
        ) : (
          <>
            <ellipse cx="60" cy={SOIL_Y + 4} rx="34" ry="8" fill={COLORS.soilShadow} />
            <ellipse cx="60" cy={SOIL_Y + 1} rx="34" ry="6.5" fill={COLORS.soil} />
            <ellipse cx="60" cy={SOIL_Y - 0.5} rx="24" ry="4" fill={COLORS.soilLight} />
          </>
        )}

        <g>
          <AnimatePresence mode="sync">
            {stage === 0 && (
              <motion.g
                key="seed"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: SHRINK_ANIMATION_MS / 1000 }}
              >
                <ellipse cx="60" cy="87" rx="7.5" ry="9.5" fill={COLORS.seed} transform="rotate(-12 60 87)" />
                <ellipse cx="57.5" cy="83.5" rx="2.4" ry="3.4" fill={COLORS.seedHighlight} transform="rotate(-12 57.5 83.5)" />
              </motion.g>
            )}

            {stage >= 1 && (
              <motion.path
                key="stem"
                d={`M60 ${SOIL_Y} Q 56 ${(SOIL_Y + stemTop) / 2} 60 ${stemTop}`}
                stroke={COLORS.stem}
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ pathLength: 0, opacity: 0 }}
                transition={{ duration: GROW_ANIMATION_MS / 1000, ease: 'easeOut' }}
              />
            )}

            {/* 잎 위치/좌우 반전은 안쪽 <g>의 transform 속성이 담당하고, 애니메이션되는
                scale은 바깥 motion.g가 담당한다 — 한 엘리먼트에 둘을 같이 주면
                framer가 style.transform으로 속성 transform을 덮어써서 잎이 원점으로 튄다. */}
            {leaves.map((leaf) => (
              <motion.g
                key={leaf.key}
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.2 }}
                transition={{ duration: GROW_ANIMATION_MS / 1000, delay: leaf.delay, ease: [0.22, 1, 0.36, 1] }}
              >
                <g
                  transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.rotate}) scale(${leaf.direction * leaf.scale} ${leaf.scale})`}
                >
                  <>
                    <path d={LEAF_PATH} fill={COLORS.leaf} />
                    {/* 잎맥 — 단색 위에 한 겹 얹어 밋밋함을 덜어준다(그라디언트 없이). */}
                    <path d={LEAF_VEIN_PATH} fill="none" stroke={COLORS.leafVein} strokeWidth="1.4" strokeLinecap="round" />
                  </>
                </g>
              </motion.g>
            ))}

            {/* motion.g에 originX/originY(=transform-box: fill-box)를 주면 크롬에서
              리렌더 후 그룹이 통째로 안 그려지는 문제가 있어, 기본 원점(도형 중앙)을 쓴다. */}
          {stage === 5 && (
              <motion.g
                key="bud"
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.3 }}
                transition={{ duration: GROW_ANIMATION_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
              >
                <path
                  d={`M60 ${stemTop - 20} C 70 ${stemTop - 12} 69 ${stemTop + 2} 60 ${stemTop + 3} C 51 ${stemTop + 2} 50 ${stemTop - 12} 60 ${stemTop - 20} Z`}
                  fill={COLORS.bud}
                />
                <path
                  d={`M60 ${stemTop - 20} C 65 ${stemTop - 12} 65 ${stemTop} 60 ${stemTop + 3}`}
                  stroke={COLORS.budLine}
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                />
              </motion.g>
            )}

            {stage === 6 && (
              <motion.g
                key="flower"
                initial={{ opacity: 0, scale: 0.3, rotate: -25 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.3, rotate: -25 }}
                transition={{ duration: GROW_ANIMATION_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
              >
                {[0, 60, 120, 180, 240, 300].map((angle) => (
                  <ellipse
                    key={angle}
                    cx="60"
                    cy={stemTop - 20}
                    rx="7"
                    ry="12"
                    fill={COLORS.petal}
                    transform={`rotate(${angle} 60 ${stemTop - 8})`}
                  />
                ))}
                <circle cx="60" cy={stemTop - 8} r="7.5" fill={COLORS.flowerCenter} />
              </motion.g>
            )}
          </AnimatePresence>
        </g>

        {/* 반짝임 — 상점 기록 순간에만 잠깐 나타났다 사라진다 */}
        <AnimatePresence>
          {showSparkles &&
            SPARKLE_POSITIONS.map((position, index) => (
              <motion.path
                key={`${pulseToken}-${index}`}
                d={SPARKLE_PATH}
                transform={`translate(${position.x} ${position.y})`}
                fill={COLORS.sparkle}
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ opacity: [0, 1, 0], scale: [0.2, 1.1, 0.4] }}
                exit={{ opacity: 0 }}
                transition={{ duration: GROW_ANIMATION_MS / 1000, delay: index * 0.05, ease: 'easeOut' }}
              />
            ))}
        </AnimatePresence>
      </svg>
    </motion.div>
  )
}

type LeafSpec = {
  key: string
  x: number
  y: number
  rotate: number
  direction: 1 | -1
  scale: number
  delay: number
}

/**
 * 단계별 잎 구성.
 * - 1단계: 떡잎 한 쌍(작고 낮게)
 * - 2단계: 첫 잎 한 쌍
 * - 3단계: 줄기가 자라며 위쪽에 한 쌍 추가
 * - 4단계 이상: 한 쌍 더 (풍성한 잎)
 * y좌표는 줄기 높이(stemTop)에 대한 비율로 계산한다 — 단계별 좌표를 따로 적지 않는다.
 */
function buildLeaves(stage: GrowthStage, stemTop: number): LeafSpec[] {
  if (stage < 1) return []

  const at = (ratio: number) => SOIL_Y - (SOIL_Y - stemTop) * ratio
  const pair = (key: string, y: number, scale: number, delay: number, rotate: number): LeafSpec[] => [
    { key: `${key}-l`, x: 58, y, rotate: -rotate, direction: -1, scale, delay },
    { key: `${key}-r`, x: 62, y, rotate, direction: 1, scale, delay: delay + 0.06 },
  ]

  if (stage === 1) return pair('cotyledon', at(0.85), 0.5, 0.1, 8)

  const leaves: LeafSpec[] = [...pair('lower', at(0.45), 0.72, 0.05, 12)]
  if (stage >= 3) leaves.push(...pair('mid', at(0.68), 0.8, 0.12, 6))
  if (stage >= 4) leaves.push(...pair('upper', at(0.88), 0.66, 0.18, -4))
  return leaves
}
