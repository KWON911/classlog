import { describe, expect, it } from 'vitest'
import { calculateGardenLayout } from './gardenLayout'

const CLASSROOM_SCREEN = { width: 1900, height: 1000 }

describe('calculateGardenLayout', () => {
  it('전체화면에서는 일반 보기보다 식물이 확실히 커진다', () => {
    const normal = calculateGardenLayout({ width: 1200, studentCount: 25, fullscreen: false })
    const full = calculateGardenLayout({ ...CLASSROOM_SCREEN, studentCount: 25, fullscreen: true })
    expect(full.plantHeight).toBeGreaterThan(normal.plantHeight)
  })

  it('학생이 적을수록 식물이 커진다 (화면이 비어 보이지 않게)', () => {
    const few = calculateGardenLayout({ ...CLASSROOM_SCREEN, studentCount: 6, fullscreen: true })
    const many = calculateGardenLayout({ ...CLASSROOM_SCREEN, studentCount: 30, fullscreen: true })
    expect(few.plantHeight).toBeGreaterThan(many.plantHeight)
  })

  it('학생이 많아도 식물이 최소 크기 아래로 작아지지 않는다', () => {
    const layout = calculateGardenLayout({ ...CLASSROOM_SCREEN, studentCount: 40, fullscreen: true })
    expect(layout.plantHeight).toBeGreaterThanOrEqual(92)
  })

  it('학생이 아주 적어도 식물이 무한정 커지지는 않는다', () => {
    const layout = calculateGardenLayout({ ...CLASSROOM_SCREEN, studentCount: 2, fullscreen: true })
    expect(layout.plantHeight).toBeLessThanOrEqual(260)
  })

  it('모든 학생이 화면 안에 들어가도록 행 수를 잡는다', () => {
    const count = 25
    const layout = calculateGardenLayout({ ...CLASSROOM_SCREEN, studentCount: count, fullscreen: true })
    const rows = Math.ceil(count / layout.columns)
    const usedHeight = rows * layout.plantHeight * 1.34 + layout.gap * (rows - 1)
    expect(usedHeight).toBeLessThanOrEqual(CLASSROOM_SCREEN.height + 1)
  })

  it('좁은 화면에서는 열 수가 줄어든다', () => {
    const wide = calculateGardenLayout({ width: 1900, height: 1000, studentCount: 25, fullscreen: true })
    const narrow = calculateGardenLayout({ width: 700, height: 1000, studentCount: 25, fullscreen: true })
    expect(narrow.columns).toBeLessThan(wide.columns)
  })

  it('세로로 납작한 화면이면 열을 더 늘려 행 수를 줄인다', () => {
    const tall = calculateGardenLayout({ width: 1400, height: 1200, studentCount: 24, fullscreen: true })
    const short = calculateGardenLayout({ width: 1400, height: 500, studentCount: 24, fullscreen: true })
    expect(short.columns).toBeGreaterThanOrEqual(tall.columns)
  })

  it('이름 글자 크기는 식물 크기를 따라가되 범위 안에 머문다', () => {
    const tiny = calculateGardenLayout({ width: 320, studentCount: 30, fullscreen: false })
    const huge = calculateGardenLayout({ width: 2400, height: 1300, studentCount: 3, fullscreen: true })
    expect(tiny.nameFontSize).toBeGreaterThanOrEqual(11)
    expect(huge.nameFontSize).toBeLessThanOrEqual(30)
    expect(huge.nameFontSize).toBeGreaterThan(tiny.nameFontSize)
  })

  it('일반 보기는 좁은 화면에서도 식물이 최소 크기까지 쪼그라들지 않는다', () => {
    // 태블릿 세로 폭. 높이를 제약으로 쓰던 초기 구현이 여기서 최소값(68px)까지 줄어들었다.
    const layout = calculateGardenLayout({ width: 700, studentCount: 25, fullscreen: false })
    expect(layout.plantHeight).toBeGreaterThan(90)
    expect(layout.columns).toBeGreaterThanOrEqual(4)
  })

  it('일반 보기는 화면이 넓어지면 열이 늘어난다', () => {
    const narrow = calculateGardenLayout({ width: 700, studentCount: 25, fullscreen: false })
    const wide = calculateGardenLayout({ width: 1500, studentCount: 25, fullscreen: false })
    expect(wide.columns).toBeGreaterThan(narrow.columns)
  })

  it('학생이 없어도 안전한 값을 돌려준다', () => {
    const layout = calculateGardenLayout({ width: 1000, studentCount: 0, fullscreen: false })
    expect(layout.columns).toBeGreaterThanOrEqual(1)
    expect(Number.isFinite(layout.plantHeight)).toBe(true)
  })
})
