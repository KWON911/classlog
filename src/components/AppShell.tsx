import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CalendarCheck, ClipboardList, House, LayoutGrid, LogOut, UsersRound } from 'lucide-react'
import { useAuth } from '../lib/hooks/useAuth'

function linkClass(active: boolean) {
  return `flex h-[46px] items-center gap-3 rounded-[10px] px-[14px] text-base font-semibold transition-colors ${
    active ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'
  }`
}

export function AppShell() {
  const { signOut } = useAuth()
  const location = useLocation()

  const rosterActive =
    location.pathname === '/students' ||
    (location.pathname.startsWith('/students/') && location.pathname !== '/students/manage')

  return (
    <div className="flex h-screen print:h-auto">
      <nav
        aria-label="주 메뉴"
        className="flex w-[240px] flex-col border-r border-[#E5E9F2] bg-[#F7F9FC] px-4 py-6 print:hidden"
      >
        <img src="/login-logo.png" alt="Classlog" className="mx-auto mb-6 h-auto w-24" />

        <div className="flex flex-col gap-[6px]">
          <NavLink to="/home" className={({ isActive }) => linkClass(isActive)}>
            <House size={20} />
            홈
          </NavLink>
          <NavLink to="/students/manage" className={({ isActive }) => linkClass(isActive)}>
            <UsersRound size={20} />
            정보관리
          </NavLink>
          <NavLink to="/students" className={() => linkClass(rosterActive)}>
            <ClipboardList size={20} />
            학급기록
          </NavLink>
          <NavLink to="/attendance" className={({ isActive }) => linkClass(isActive)}>
            <CalendarCheck size={20} />
            출결관리
          </NavLink>
          <NavLink to="/seating" className={({ isActive }) => linkClass(isActive)}>
            <LayoutGrid size={20} />
            자리배치
          </NavLink>
        </div>

        <div className="flex-1" />

        <div className="border-t border-[#E5E9F2] pt-3">
          <button
            onClick={() => signOut()}
            className="flex h-[46px] w-full items-center gap-3 rounded-[10px] px-[14px] text-base font-semibold text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={20} />
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
