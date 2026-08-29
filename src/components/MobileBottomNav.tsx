import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Ellipsis, ShieldAlert, X } from 'lucide-react'
import { MORE_NAV_ITEMS, PRIMARY_NAV_ITEMS, isNavItemActive } from '../lib/navItems'
import { isAdminEmail } from '../lib/admin'
import { useAuth } from '../lib/hooks/useAuth'

export function MobileBottomNav() {
  const { pathname } = useLocation()
  const { session } = useAuth()
  const [showMore, setShowMore] = useState(false)
  const isAdmin = isAdminEmail(session?.user.email)
  const moreItems = MORE_NAV_ITEMS

  // Close the sheet whenever navigation happens, whether via its own rows or elsewhere.
  useEffect(() => {
    setShowMore(false)
  }, [pathname])

  useEffect(() => {
    if (!showMore) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowMore(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showMore])

  const moreActive = moreItems.some((item) => isNavItemActive(item.to, pathname))

  return (
    <>
      {showMore && (
        <div className="fixed inset-0 z-50 bg-black/30 md:hidden" onClick={() => setShowMore(false)} aria-hidden="true" />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label="더보기 메뉴"
        className={`fixed inset-x-0 z-50 rounded-t-2xl border border-b-0 border-[#E5E9F2] bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)] transition-all duration-200 md:hidden ${
          showMore ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
        style={{ bottom: 'calc(var(--mobile-bottom-nav-height) + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between px-4 pb-1 pt-3">
          <span className="text-sm font-semibold text-gray-900">더보기</span>
          <button
            type="button"
            onClick={() => setShowMore(false)}
            aria-label="더보기 메뉴 닫기"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-col gap-1 p-2 pb-[calc(env(safe-area-inset-bottom)+8px)]">
          {moreItems.map((item) => {
            const active = isNavItemActive(item.to, pathname)
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors ${
                  active ? 'bg-brand-50 text-brand-600' : 'text-slate-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={20} aria-hidden="true" />
                {item.label}
              </Link>
            )
          })}
          {isAdmin && (
            <div className="mt-2 border-t border-slate-200 pt-2">
              <Link
                to="/admin"
                aria-current={isNavItemActive('/admin', pathname) ? 'page' : undefined}
                className={`flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors ${
                  isNavItemActive('/admin', pathname)
                    ? 'bg-red-50 text-red-600'
                    : 'text-red-600 hover:bg-red-50'
                }`}
              >
                <ShieldAlert size={20} aria-hidden="true" />
                관리자
              </Link>
            </div>
          )}
        </div>
      </div>

      <nav
        aria-label="주 메뉴"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[#E5E9F2] bg-white md:hidden print:hidden"
        style={{
          height: 'calc(var(--mobile-bottom-nav-height) + env(safe-area-inset-bottom))',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {PRIMARY_NAV_ITEMS.map((item) => {
          const active = isNavItemActive(item.to, pathname)
          const Icon = item.icon
          return (
            <Link
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
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-label="더보기 메뉴 열기"
          aria-expanded={showMore}
          className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
            showMore || moreActive ? 'text-brand-600' : 'text-slate-500'
          }`}
        >
          <Ellipsis size={22} aria-hidden="true" />
          <span>더보기</span>
        </button>
      </nav>
    </>
  )
}
