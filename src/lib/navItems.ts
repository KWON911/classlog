import { AppWindow, CalendarCheck, ClipboardList, House, LayoutGrid, Sprout, UsersRound } from 'lucide-react'
import type { ComponentType } from 'react'

export type NavIcon = ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>

export type NavItem = {
  to: string
  label: string
  mobileLabel: string
  icon: NavIcon
}

// Always visible: desktop sidebar (in full) and the mobile bottom bar's first
// 4 slots — the bar's 5th slot is a "더보기" toggle, not a nav item itself.
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { to: '/home', label: '홈', mobileLabel: '홈', icon: House },
  { to: '/students/manage', label: '정보관리', mobileLabel: '정보', icon: UsersRound },
  { to: '/attendance', label: '출결관리', mobileLabel: '출결', icon: CalendarCheck },
  { to: '/students', label: '학급기록', mobileLabel: '기록', icon: ClipboardList },
]

// Desktop sidebar appends these after PRIMARY_NAV_ITEMS (still one flat list —
// desktop has no space constraint). Mobile only surfaces them inside the
// MobileBottomNav "더보기" sheet, so the bottom bar always stays at 5 slots
// no matter how many secondary items get added here later.
export const MORE_NAV_ITEMS: NavItem[] = [
  { to: '/growth-garden', label: '성장정원', mobileLabel: '성장정원', icon: Sprout },
  { to: '/seating', label: '자리배치', mobileLabel: '자리', icon: LayoutGrid },
  { to: '/apps', label: '앱보관함', mobileLabel: '앱보관함', icon: AppWindow },
]

/**
 * `/students` (학급기록)와 `/students/manage` (정보관리)가 `/students*` 접두사를
 * 공유하므로, prefix 매칭에 맡기면 `/students/manage`에서 두 항목이 동시에 active가
 * 된다. 그래서 항목별 active 여부를 여기서 직접 계산한다(사이드바가 NavLink 대신
 * Link를 쓰는 이유도 같다 — NavLink는 자체 prefix 매칭으로 aria-current를 덧붙인다).
 * 하위 경로를 가진 `/students` 형제 항목이 늘어나면 이 목록에 추가할 것.
 */
const STUDENTS_SIBLING_PREFIXES = ['/students/manage']

export function isNavItemActive(itemTo: string, pathname: string): boolean {
  if (itemTo === '/students') {
    if (pathname === '/students') return true
    if (!pathname.startsWith('/students/')) return false
    return !STUDENTS_SIBLING_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  }
  return pathname === itemTo || pathname.startsWith(`${itemTo}/`)
}
