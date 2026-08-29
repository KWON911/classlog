import { describe, expect, it } from 'vitest'
import { isNavItemActive } from './navItems'

/**
 * `/students`와 `/students/manage`가 접두사를 공유하므로, 한 경로에서 두 항목이
 * 동시에 active가 되지 않는지가 핵심이다.
 */
describe('isNavItemActive', () => {
  it('학급기록은 /students와 그 하위 학생 상세에서만 active다', () => {
    expect(isNavItemActive('/students', '/students')).toBe(true)
    expect(isNavItemActive('/students', '/students/abc-123')).toBe(true)
  })

  it('정보관리 경로에서는 학급기록이 active가 아니다', () => {
    expect(isNavItemActive('/students', '/students/manage')).toBe(false)
  })

  it('성장정원은 자기 경로와 학생 상세에서만 active다', () => {
    expect(isNavItemActive('/growth-garden', '/growth-garden')).toBe(true)
    expect(isNavItemActive('/growth-garden', '/growth-garden/abc-123')).toBe(true)
    expect(isNavItemActive('/growth-garden', '/students')).toBe(false)
  })

  it('성장정원 경로에서 학급기록이 함께 active가 되지 않는다', () => {
    expect(isNavItemActive('/students', '/growth-garden')).toBe(false)
    expect(isNavItemActive('/students', '/growth-garden/abc-123')).toBe(false)
  })

  it('정보관리는 자기 경로에서만 active다', () => {
    expect(isNavItemActive('/students/manage', '/students/manage')).toBe(true)
    expect(isNavItemActive('/students/manage', '/students')).toBe(false)
  })

  it('접두사가 겹치지 않는 항목은 기존대로 동작한다', () => {
    expect(isNavItemActive('/attendance', '/attendance')).toBe(true)
    expect(isNavItemActive('/seating', '/attendance')).toBe(false)
    expect(isNavItemActive('/apps', '/apps')).toBe(true)
  })
})
