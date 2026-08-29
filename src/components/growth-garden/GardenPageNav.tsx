import { Link, useLocation } from 'react-router-dom'
import { CalendarRange, Settings, Sprout } from 'lucide-react'

const ITEMS = [
  { to: '/growth-garden', label: '정원', icon: Sprout },
  { to: '/growth-garden/report', label: '월별 리포트', icon: CalendarRange },
  { to: '/growth-garden/settings', label: '설정', icon: Settings },
]

/**
 * 성장정원 안의 화면 전환(정원 ↔ 월별 리포트).
 *
 * 정원 화면 안의 카드/정원 보기 토글과 생김새를 맞추되, 이건 라우트 이동이라
 * 버튼이 아니라 Link다(북마크·뒤로가기가 그대로 동작해야 한다).
 */
export function GardenPageNav() {
  const { pathname } = useLocation()

  return (
    <div className="inline-flex h-9 w-fit shrink-0 overflow-hidden rounded-lg border border-gray-300 bg-white text-sm">
      {ITEMS.map((item) => {
        const active = pathname === item.to
        const Icon = item.icon
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex items-center gap-1 px-3 font-medium transition-colors ${
              active ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icon size={14} aria-hidden="true" />
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
