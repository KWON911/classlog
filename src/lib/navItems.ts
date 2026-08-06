import { CalendarCheck, ClipboardList, House, LayoutGrid, UsersRound } from 'lucide-react'
import type { ComponentType } from 'react'

export type NavIcon = ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>

export type NavItem = {
  to: string
  label: string
  mobileLabel: string
  icon: NavIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/home', label: '홈', mobileLabel: '홈', icon: House },
  { to: '/students/manage', label: '정보관리', mobileLabel: '정보', icon: UsersRound },
  { to: '/students', label: '학급기록', mobileLabel: '기록', icon: ClipboardList },
  { to: '/attendance', label: '출결관리', mobileLabel: '출결', icon: CalendarCheck },
  { to: '/seating', label: '자리배치', mobileLabel: '자리', icon: LayoutGrid },
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
