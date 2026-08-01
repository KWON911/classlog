import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/hooks/useAuth'

function linkClass(active: boolean) {
  return `flex items-center gap-2 rounded px-3 py-2 text-sm ${
    active ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
  }`
}

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: 'h-[18px] w-[18px] flex-shrink-0',
  'aria-hidden': true,
}

function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9" />
      <path d="M9.5 20v-6h5v6" />
    </svg>
  )
}

function ManageIcon() {
  return (
    <svg {...iconProps}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="9" cy="6" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg {...iconProps}>
      <rect x="4" y="3.5" width="16" height="17" rx="2" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="13" y2="16" />
    </svg>
  )
}

function CalendarCheckIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
      <line x1="8" y1="3" x2="8" y2="6.5" />
      <line x1="16" y1="3" x2="16" y2="6.5" />
      <path d="M8 14.5l2 2 4-4.5" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg {...iconProps}>
      <rect x="4" y="4" width="7" height="7" rx="1.2" />
      <rect x="13" y="4" width="7" height="7" rx="1.2" />
      <rect x="4" y="13" width="7" height="7" rx="1.2" />
      <rect x="13" y="13" width="7" height="7" rx="1.2" />
    </svg>
  )
}

export function AppShell() {
  const { signOut } = useAuth()
  const location = useLocation()

  const rosterActive =
    location.pathname === '/students' ||
    (location.pathname.startsWith('/students/') && location.pathname !== '/students/manage')

  return (
    <div className="flex h-screen print:h-auto">
      <nav aria-label="주 메뉴" className="flex w-48 flex-col gap-1 border-r border-gray-200 p-4 print:hidden">
        <img src="/login-logo.png" alt="Classlog" className="mx-auto mb-4 h-auto w-24" />
        <NavLink to="/home" className={({ isActive }) => linkClass(isActive)}>
          <HomeIcon />
          홈
        </NavLink>
        <NavLink to="/students/manage" className={({ isActive }) => linkClass(isActive)}>
          <ManageIcon />
          정보관리
        </NavLink>
        <NavLink to="/students" className={() => linkClass(rosterActive)}>
          <ListIcon />
          학급기록
        </NavLink>
        <NavLink to="/attendance" className={({ isActive }) => linkClass(isActive)}>
          <CalendarCheckIcon />
          출결관리
        </NavLink>
        <NavLink to="/seating" className={({ isActive }) => linkClass(isActive)}>
          <GridIcon />
          자리배치
        </NavLink>
        <div className="flex-1" />
        <div className="border-t border-gray-200 pt-3">
          <button
            onClick={() => signOut()}
            className="w-full rounded border border-gray-300 px-3 py-2 text-left text-sm"
          >
            로그아웃
          </button>
        </div>
      </nav>
      <main className="flex-1 overflow-auto print:overflow-visible">
        <Outlet />
      </main>
    </div>
  )
}
