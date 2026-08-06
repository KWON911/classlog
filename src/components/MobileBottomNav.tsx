import { NavLink, useLocation } from 'react-router-dom'
import { NAV_ITEMS, isNavItemActive } from '../lib/navItems'

export function MobileBottomNav() {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="주 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[#E5E9F2] bg-white md:hidden print:hidden"
      style={{
        height: 'calc(var(--mobile-bottom-nav-height) + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = isNavItemActive(item.to, pathname)
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
              active ? 'text-brand-600' : 'text-slate-500'
            }`}
          >
            <Icon size={22} aria-hidden="true" />
            <span>{item.mobileLabel}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
