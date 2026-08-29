/**
 * 정원 보기의 자리 크기 계산 — React 의존 없는 순수 모듈.
 *
 * 식물 크기를 고정값 하나로 두면 교실 대형 화면에서는 우표만 하고, 학생이 30명인
 * 학급에서는 화면 밖으로 넘친다. 그래서 "화면 크기 + 학생 수"로 매번 계산한다.
 * 계산 방식: 가능한 열 수를 모두 시도해 보고, 모든 학생이 화면 안에 들어가면서
 * 식물이 가장 커지는 조합을 고른다.
 */

export type GardenLayoutInput = {
  /** 정원 컨테이너의 사용 가능한 너비(px) */
  width: number
  /**
   * 사용 가능한 높이(px). 전체화면일 때만 넘어온다 — 그때만 "모든 학생이 한 화면에"가
   * 제약이 되기 때문. 일반 보기는 세로로 스크롤되므로 높이를 보지 않는다.
   */
  height?: number
  studentCount: number
  fullscreen: boolean
}

export type GardenLayout = {
  columns: number
  /** 식물 SVG 높이(px) */
  plantHeight: number
  /** 학생 이름 글자 크기(px) */
  nameFontSize: number
  /** 자리 사이 간격(px) */
  gap: number
  /** 짝수 번째 자리를 내려 심는 지그재그 오프셋(px) */
  stagger: number
}

/** 자리 하나의 높이 = 식물 높이 × 이 값 (아래 이름표·여백 몫) */
const PLOT_HEIGHT_FACTOR = 1.34
/** 일반 보기에서 목표로 하는 자리 너비 — 이 값으로 열 수를 정한다. */
const PREFERRED_CELL_WIDTH = 150

type Bounds = {
  minPlant: number
  maxPlant: number
  /** 이보다 좁은 열은 이름이 겹치므로 후보에서 제외 */
  minCell: number
  gap: number
}

function boundsFor(fullscreen: boolean): Bounds {
  return fullscreen
    ? { minPlant: 92, maxPlant: 260, minCell: 116, gap: 16 }
    : { minPlant: 68, maxPlant: 132, minCell: 88, gap: 8 }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function withDerived(columns: number, plantHeight: number, gap: number): GardenLayout {
  const rounded = Math.round(plantHeight)
  return {
    columns,
    plantHeight: rounded,
    // 이름은 식물 크기에 비례하되 너무 작거나 커지지 않게 묶는다.
    nameFontSize: Math.round(clamp(rounded * 0.17, 11, 30)),
    gap,
    stagger: Math.round(rounded * 0.12),
  }
}

export function calculateGardenLayout({
  width,
  height,
  studentCount,
  fullscreen,
}: GardenLayoutInput): GardenLayout {
  const bounds = boundsFor(fullscreen)
  const count = Math.max(1, studentCount)
  const usableWidth = Math.max(bounds.minCell, width)
  const maxColumns = Math.max(
    1,
    Math.min(count, Math.floor((usableWidth + bounds.gap) / (bounds.minCell + bounds.gap))),
  )

  // 일반 보기: 세로로 스크롤되므로 높이는 제약이 아니다. 목표 자리 너비로 열 수만
  // 정하고 식물은 그 폭에 맞춘다(높이까지 제약으로 넣으면 좁은 화면에서 식물이
  // 최소 크기까지 쪼그라든다).
  if (!fullscreen || !height) {
    const columns = clamp(Math.round(usableWidth / PREFERRED_CELL_WIDTH), 1, maxColumns)
    const cellWidth = (usableWidth - bounds.gap * (columns - 1)) / columns
    return withDerived(columns, clamp(cellWidth * 0.94, bounds.minPlant, bounds.maxPlant), bounds.gap)
  }

  // 전체화면: 모든 학생이 한 화면에 들어가야 하므로 높이가 진짜 제약이다.
  // 가능한 열 수를 모두 시도해 식물이 가장 커지는 조합을 고른다.
  const usableHeight = Math.max(bounds.minPlant, height)
  let best = { columns: 1, plantHeight: bounds.minPlant }

  for (let columns = 1; columns <= maxColumns; columns += 1) {
    const rows = Math.ceil(count / columns)
    const cellWidth = (usableWidth - bounds.gap * (columns - 1)) / columns
    const cellHeight = (usableHeight - bounds.gap * (rows - 1)) / rows
    const plant = clamp(
      Math.min(cellWidth * 0.94, cellHeight / PLOT_HEIGHT_FACTOR),
      bounds.minPlant,
      bounds.maxPlant,
    )
    // 같은 크기라면 열이 많은 쪽(= 가로를 더 채우는 쪽)을 택한다.
    if (plant >= best.plantHeight) best = { columns, plantHeight: plant }
  }

  return withDerived(best.columns, best.plantHeight, bounds.gap)
}
