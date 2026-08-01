import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/hooks/useAuth'

function linkClass(active: boolean) {
  return `rounded px-3 py-2 text-sm ${active ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`
}

export function AppShell() {
  const { signOut } = useAuth()
  const location = useLocation()

  const rosterActive =
    location.pathname === '/students' ||
    (location.pathname.startsWith('/students/') && location.pathname !== '/students/manage')

  return (
    <div className="flex h-screen">
      <nav className="flex w-48 flex-col gap-1 border-r border-gray-200 p-4 print:hidden">
        <NavLink to="/students" className={() => linkClass(rosterActive)}>
          학급기록
        </NavLink>
        <NavLink to="/attendance" className={({ isActive }) => linkClass(isActive)}>
          출결관리
        </NavLink>
        <NavLink to="/seating" className={({ isActive }) => linkClass(isActive)}>
          학급 자리 배치
        </NavLink>
        <div className="flex-1" />
        <NavLink to="/students/manage" className={({ isActive }) => linkClass(isActive)}>
          명부 관리
        </NavLink>
        <button
          onClick={() => signOut()}
          className="rounded border border-gray-300 px-3 py-2 text-left text-sm"
        >
          로그아웃
        </button>
      </nav>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
