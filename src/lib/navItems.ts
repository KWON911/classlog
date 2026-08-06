import { AppWindow, CalendarCheck, ClipboardList, House, LayoutGrid, UsersRound } from 'lucide-react'
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
  { to: '/students', label: '학급기록', mobileLabel: '기록', icon: ClipboardList },
  { to: '/attendance', label: '출결관리', mobileLabel: '출결', icon: CalendarCheck },
]

// Desktop sidebar appends these after PRIMARY_NAV_ITEMS (still one flat list —
// desktop has no space constraint). Mobile only surfaces them inside the
// MobileBottomNav "더보기" sheet, so the bottom bar always stays at 5 slots
// no matter how many secondary items get added here later.
export const MORE_NAV_ITEMS: NavItem[] = [
  { to: '/seating', label: '자리배치', mobileLabel: '자리', icon: LayoutGrid },
  { to: '/apps', label: '앱보관함', mobileLabel: '앱보관함', icon: AppWindow },
]

/**
 * `/students` (학급기록) and `/students/manage` (정보관리) share the `/students*`
 * prefix, so React Router's default NavLink prefix-matching would mark both
 * active on `/students/manage`. Compute explicit active state per item instead
 * of trusting NavLink's own `isActive`/`aria-current`.
 */
export function isNavItemActive(itemTo: string, pathname: string): boolean {
  if (itemTo === '/students') {
    return pathname === '/students' || (pathname.startsWith('/students/') && pathname !== '/students/manage')
  }
  return pathname === itemTo || pathname.startsWith(`${itemTo}/`)
}
