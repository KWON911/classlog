import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { useAuth } from '../lib/hooks/useAuth'
import { useSidebarCollapsed } from '../lib/hooks/useSidebarCollapsed'
import { NAV_ITEMS, isNavItemActive } from '../lib/navItems'
import { MobileBottomNav } from './MobileBottomNav'

const tooltipClass =
  'pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100'

function itemLinkClass(active: boolean, collapsed: boolean) {
  return `flex h-[46px] items-center gap-3 rounded-[10px] text-base font-semibold transition-colors ${
    collapsed ? 'justify-center px-0' : 'px-[14px]'
  } ${active ? 'bg-brand-600 text-white' : 'text-slate-700 hover:bg-brand-50 hover:text-brand-600'}`
}

export function AppShell() {
  const { signOut } = useAuth()
  const { pathname } = useLocation()
  const { collapsed, toggle } = useSidebarCollapsed()

  return (
    <div className="flex min-h-dvh print:h-auto">
      <nav
        aria-label="주 메뉴"
        className="hidden shrink-0 flex-col border-r border-[#E5E9F2] bg-[#F7F9FC] py-6 transition-[width] duration-200 ease-in-out md:flex print:hidden"
        style={{ width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-expanded-width)' }}
      >
        <div className={`mb-2 flex justify-center ${collapsed ? 'px-2' : 'px-4'}`}>
          <img
            src="/login-logo.png"
            alt="Classlog"
            className={`h-auto object-contain ${collapsed ? 'w-9' : 'w-24'}`}
          />
        </div>

        <div className={`mb-4 flex ${collapsed ? 'justify-center' : 'justify-end'} px-3`}>
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
            aria-expanded={!collapsed}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            {collapsed ? <ChevronRight size={18} aria-hidden="true" /> : <ChevronLeft size={18} aria-hidden="true" />}
          </button>
        </div>

        <div className={`flex flex-col gap-[6px] ${collapsed ? 'px-3' : 'px-4'}`}>
          {NAV_ITEMS.map((item) => {
            const active = isNavItemActive(item.to, pathname)
            const Icon = item.icon
            return (
              <div key={item.to} className="group relative">
                <NavLink to={item.to} aria-label={item.label} aria-current={active ? 'page' : undefined} className={itemLinkClass(active, collapsed)}>
                  <Icon size={20} aria-hidden="true" />
                  {!collapsed && item.label}
                </NavLink>
                {collapsed && (
                  <span role="tooltip" className={tooltipClass}>
                    {item.label}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex-1" />

        <div className={`border-t border-[#E5E9F2] pt-3 ${collapsed ? 'px-3' : 'px-4'}`}>
          <div className="group relative">
            <button
              type="button"
              onClick={() => signOut()}
              aria-label="로그아웃"
              className={`flex h-[46px] w-full items-center gap-3 rounded-[10px] text-base font-semibold text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 ${
                collapsed ? 'justify-center px-0' : 'px-[14px]'
              }`}
            >
              <LogOut size={20} aria-hidden="true" />
              {!collapsed && '로그아웃'}
            </button>
            {collapsed && (
              <span role="tooltip" className={tooltipClass}>
                로그아웃
              </span>
            )}
          </div>
        </div>
      </nav>

      <main className="min-w-0 flex-1 overflow-auto print:overflow-visible">
        <Outlet />
      </main>

      <MobileBottomNav />
    </div>
  )
}
