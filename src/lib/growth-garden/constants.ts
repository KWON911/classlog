/**
 * 학급 성장정원 — 하드코딩 방지용 설정 단일 소스.
 *
 * 성장 단계·점수 임계값·빠른 사유·애니메이션 타이밍은 모두 여기서만 바뀐다.
 * 컴포넌트/서비스/훅 어디에도 숫자를 다시 적지 말 것.
 */

export type GrowthStage = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type GrowthStageConfig = {
  stage: GrowthStage
  /** 카드/상세 화면에 노출되는 한국어 단계명 */
  label: string
  /** 이 단계에 도달하기 위한 최소 누적 점수 (오름차순, 0단계는 반드시 0) */
  minScore: number
  /** 교사에게 보여주는 한 줄 설명 */
  description: string
  /** 단계별 강조색 — 카드 배지/진행바에 사용 */
  accent: string
}

/**
 * 반드시 minScore 오름차순이어야 한다 (`stageForScore`가 이 순서를 신뢰한다).
 * 단계를 늘리려면 여기에 항목을 추가하고 `PlantIllustration`에 대응 파트를 추가하면 된다.
 */
export const GROWTH_STAGES: GrowthStageConfig[] = [
  { stage: 0, label: '씨앗', minScore: 0, description: '흙 속에서 싹틀 준비를 하고 있어요.', accent: '#a1785a' },
  { stage: 1, label: '새싹', minScore: 3, description: '떡잎이 흙 위로 올라왔어요.', accent: '#7cb342' },
  { stage: 2, label: '작은 잎', minScore: 6, description: '첫 잎이 자리를 잡았어요.', accent: '#5aa84f' },
  { stage: 3, label: '줄기 성장', minScore: 10, description: '줄기가 쭉쭉 자라고 있어요.', accent: '#2f9e6b' },
  { stage: 4, label: '풍성한 잎', minScore: 15, description: '잎이 무성해졌어요.', accent: '#128561' },
  { stage: 5, label: '꽃봉오리', minScore: 20, description: '곧 꽃이 필 것 같아요.', accent: '#c2649a' },
  { stage: 6, label: '꽃 피움', minScore: 25, description: '활짝 꽃을 피웠어요!', accent: '#e0577f' },
]

export const MAX_STAGE = GROWTH_STAGES[GROWTH_STAGES.length - 1].stage
/** 점수 하한 — 벌점이 누적돼도 이 아래로는 내려가지 않는다(음수 점수 UI를 만들지 않기 위해). */
export const MIN_SCORE = 0

/** 기록 모달이 처음 선택해 두는 점수 — 대부분의 기록이 1점이라 바로 저장할 수 있게 한다. */
export const DEFAULT_POINT_AMOUNT = 1
/** 기록 모달에서 고를 수 있는 점수 */
export const POINT_AMOUNT_OPTIONS = [1, 2, 3]

/** 사유 칩 — 교사가 매번 타이핑하지 않도록 자주 쓰는 문구를 미리 둔다. 문구 수정은 여기서만. */
export const MERIT_REASONS = [
  '발표를 잘했어요',
  '친구를 도왔어요',
  '수업에 적극적으로 참여했어요',
  '준비를 잘했어요',
  '약속을 잘 지켰어요',
]
export const DEMERIT_REASONS = ['준비물 미준비', '약속 미준수', '수업 방해', '정리 미흡']
/** 사유 칩 마지막에 붙는 직접 입력 옵션의 라벨 */
export const CUSTOM_REASON_LABEL = '직접 입력'

/** 모달을 열었을 때 미리 선택돼 있는 사유 */
export const DEFAULT_MERIT_REASON = MERIT_REASONS[0]
export const DEFAULT_DEMERIT_REASON = DEMERIT_REASONS[0]

/** 상세 화면의 기록 내역에서 처음 보여줄 개수 ('전체 보기'로 펼칠 수 있다) */
export const HISTORY_PREVIEW_COUNT = 10

/** 저장 성공 피드백이 화면에 머무는 시간(ms) */
export const FEEDBACK_DURATION_MS = 2000

/** 애니메이션 타이밍(ms) — 요구 사양: 상점 0.6~0.9초, 벌점 0.4~0.7초. */
export const GROW_ANIMATION_MS = 780
export const SHRINK_ANIMATION_MS = 560
/** 상점 시 뿌려지는 반짝임 개수 */
export const SPARKLE_COUNT = 6

/**
 * 데이터 소스 스위치 — services/index.ts가 이 값만 보고 구현체를 고른다.
 * `growth_points` 테이블(supabase/migrations/20260829_growth_points.sql)을 적용한
 * 프로젝트에 연결돼 있으므로 'supabase'. 로컬에서 DB 없이 화면만 볼 때는
 * 'mock'으로 되돌리면 localStorage로 동작한다.
 */
export const GROWTH_GARDEN_DATA_SOURCE: 'mock' | 'supabase' = 'supabase'

/* ─── 학급 전체 정원 환경 ──────────────────────────────────────────────
   학생 개인 식물과 별개로, 학급 전체의 성장에 따라 정원 배경이 변한다.
   기준은 "학생 1인당 평균 성장 포인트" — 합계로 잡으면 학생 수가 많은 학급이
   자동으로 유리해지고 적은 학급은 영원히 초기 단계에 머무르기 때문이다. */

export type GardenEnvironmentStage = 0 | 1 | 2 | 3 | 4 | 5

export type GardenEnvironmentConfig = {
  stage: GardenEnvironmentStage
  /** 정원 이름 — '우리 반 정원 · 새싹 정원' */
  label: string
  /** 교사·학생에게 보여주는 분위기 문구 */
  message: string
  /** 이 단계에 도달하기 위한 학생 1인당 평균 성장 포인트 (오름차순, 0단계는 0) */
  minAverage: number
  /** 잔디 레이어 불투명도 0~1 */
  grassOpacity: number
  /** 꽃필 무렵의 따뜻한 색 레이어 불투명도 0~1 */
  bloomOpacity: number
  /** 배경 장식 개수 — 풀포기 / 꽃 / 조약돌 */
  tuftCount: number
  flowerCount: number
  pebbleCount: number
  /** 정원이 살아 있어 보이게 하는 움직이는 요소들 — 단계가 오를수록 하나씩 늘어난다. */
  butterflyCount: number
  beeCount: number
  petalCount: number
  /** 마지막 단계에서만 켜지는 아주 은은한 햇빛 반짝임 */
  sparkle: boolean
}

/**
 * 반드시 minAverage 오름차순. 0단계도 황폐하지 않고 "아직 덜 자란 소박한 정원"으로
 * 보이도록 잔디를 완전히 0으로 두지 않는다.
 */
export const GARDEN_ENVIRONMENT_STAGES: GardenEnvironmentConfig[] = [
  {
    stage: 0,
    label: '씨앗 정원',
    message: '아직 흙이 드러난 소박한 정원이에요.',
    minAverage: 0,
    grassOpacity: 0.15,
    bloomOpacity: 0,
    tuftCount: 3,
    flowerCount: 0,
    pebbleCount: 0,
    butterflyCount: 0,
    beeCount: 0,
    petalCount: 0,
    sparkle: false,
  },
  {
    stage: 1,
    label: '새싹 정원',
    message: '잔디가 조금씩 돋아나고 있어요.',
    minAverage: 3,
    grassOpacity: 0.4,
    bloomOpacity: 0,
    tuftCount: 7,
    flowerCount: 0,
    pebbleCount: 2,
    butterflyCount: 0,
    beeCount: 0,
    petalCount: 0,
    sparkle: false,
  },
  {
    stage: 2,
    label: '초록 정원',
    message: '우리 반 정원이 푸르러지고 있어요.',
    minAverage: 6,
    grassOpacity: 0.65,
    bloomOpacity: 0.1,
    tuftCount: 12,
    flowerCount: 2,
    pebbleCount: 3,
    butterflyCount: 1,
    beeCount: 0,
    petalCount: 0,
    sparkle: false,
  },
  {
    stage: 3,
    label: '잎사귀 정원',
    message: '작은 풀과 잎이 부쩍 늘었어요.',
    minAverage: 10,
    grassOpacity: 0.82,
    bloomOpacity: 0.2,
    tuftCount: 16,
    flowerCount: 5,
    pebbleCount: 5,
    butterflyCount: 2,
    beeCount: 0,
    petalCount: 1,
    sparkle: false,
  },
  {
    stage: 4,
    label: '꽃 피는 정원',
    message: '여기저기 꽃이 피기 시작했어요.',
    minAverage: 15,
    grassOpacity: 0.92,
    bloomOpacity: 0.35,
    tuftCount: 20,
    flowerCount: 9,
    pebbleCount: 6,
    butterflyCount: 3,
    beeCount: 1,
    petalCount: 2,
    sparkle: false,
  },
  {
    stage: 5,
    label: '화사한 정원',
    message: '꽃이 가득한 화사한 정원이 되었어요!',
    minAverage: 22,
    grassOpacity: 1,
    bloomOpacity: 0.5,
    tuftCount: 24,
    flowerCount: 14,
    pebbleCount: 7,
    butterflyCount: 4,
    beeCount: 1,
    petalCount: 3,
    sparkle: true,
  },
]

export const MAX_ENVIRONMENT_STAGE = GARDEN_ENVIRONMENT_STAGES[GARDEN_ENVIRONMENT_STAGES.length - 1].stage

/** 배경 전환 시간(ms) — 요구 사양: 0.6~1.2초의 은은한 전환. */
export const ENVIRONMENT_TRANSITION_MS = 900

/* ─── 정원 자연 애니메이션 ─────────────────────────────────────────────
   나비·벌·꽃잎은 개체 수만 위 단계 표에서 정하고, 움직임의 성격은 여기서 정한다.
   경로는 컨테이너 크기에 대한 0~1 비율 좌표라 화면 크기·전체화면과 무관하게 쓰인다. */

/** 나비 비행 경로 프리셋 — 개체마다 하나씩 골라 쓴다(직선 이동을 피하려 waypoint를 둔다). */
export const FLIGHT_PATHS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [
    [-0.06, 0.34],
    [0.22, 0.16],
    [0.44, 0.42],
    [0.7, 0.2],
    [1.06, 0.36],
  ],
  [
    [1.05, 0.62],
    [0.72, 0.44],
    [0.48, 0.68],
    [0.24, 0.4],
    [-0.05, 0.58],
  ],
  [
    [-0.05, 0.8],
    [0.3, 0.62],
    [0.52, 0.84],
    [0.78, 0.56],
    [1.05, 0.74],
  ],
  [
    [0.5, -0.08],
    [0.66, 0.3],
    [0.38, 0.52],
    [0.62, 0.78],
    [0.44, 1.08],
  ],
]

/** 한 마리가 경로를 한 바퀴 도는 데 걸리는 시간(초) 범위 — 느리게 지나가야 산만하지 않다. */
export const FLIGHT_DURATION_RANGE = { min: 14, max: 26 } as const
/** 벌은 나비보다 조금 빠르고 작다. */
export const BEE_DURATION_RANGE = { min: 10, max: 16 } as const
/** 개체 크기(px) 범위 — 식물보다 작아야 시선을 뺏지 않는다. */
export const FLYER_SIZE_RANGE = { min: 16, max: 26 } as const
/** 꽃잎 하나가 떨어지는 시간(초) 범위 */
export const PETAL_DURATION_RANGE = { min: 9, max: 16 } as const
/** 식물이 바람에 흔들리는 주기(초) 범위 — 개체마다 달라야 한 덩어리로 움직이지 않는다. */
export const SWAY_DURATION_RANGE = { min: 3.6, max: 6.4 } as const
