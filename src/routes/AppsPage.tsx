import { Check, ChevronDown, ChevronUp, GripVertical, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { MY_APPS, type MyApp } from '../lib/myApps'
import { PageContainer } from '../components/PageContainer'
import { secondaryButtonClass, sectionCardClass } from '../lib/ui/classNames'
import { useStudents } from '../lib/hooks/useStudents'
import { openRandomDrawWithRoster } from '../lib/randomdrawIntegration'

const APP_ORDER_STORAGE_KEY = 'classlog:apps-order'
const appByUrl = new Map(MY_APPS.map((app) => [app.url, app]))

function storedAppOrder(): string[] {
  const defaultOrder = MY_APPS.map((app) => app.url)
  try {
    const stored = window.localStorage.getItem(APP_ORDER_STORAGE_KEY)
    if (!stored) return defaultOrder
    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return defaultOrder
    const knownUrls = parsed.filter((url): url is string => typeof url === 'string' && appByUrl.has(url))
    return [...knownUrls, ...defaultOrder.filter((url) => !knownUrls.includes(url))]
  } catch {
    return defaultOrder
  }
}

export function AppsPage() {
  const { students, loading } = useStudents()
  const [isReordering, setIsReordering] = useState(false)
  const [draggedUrl, setDraggedUrl] = useState<string | null>(null)
  const [orderedUrls, setOrderedUrls] = useState(storedAppOrder)
  const [query, setQuery] = useState('')
  const orderedApps = useMemo(
    () => orderedUrls.map((url) => appByUrl.get(url)).filter((app): app is MyApp => Boolean(app)),
    [orderedUrls],
  )
  // Reordering always drags within the full list — moveApp/moveAppBy resolve
  // positions against `orderedApps`' own index, which a search filter would
  // desync from `orderedUrls`' real positions. So search is simply unavailable
  // while reordering, rather than left on to silently corrupt drag targets.
  const visibleApps = useMemo(() => {
    if (isReordering) return orderedApps
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return orderedApps
    return orderedApps.filter((app) => app.name.toLowerCase().includes(trimmed))
  }, [orderedApps, isReordering, query])

  useEffect(() => {
    window.localStorage.setItem(APP_ORDER_STORAGE_KEY, JSON.stringify(orderedUrls))
  }, [orderedUrls])

  function moveApp(url: string, targetIndex: number) {
    setOrderedUrls((previous) => {
      const currentIndex = previous.indexOf(url)
      if (currentIndex < 0 || currentIndex === targetIndex) return previous
      const next = [...previous]
      next.splice(currentIndex, 1)
      next.splice(targetIndex, 0, url)
      return next
    })
  }

  function moveAppBy(url: string, offset: number) {
    const currentIndex = orderedUrls.indexOf(url)
    const targetIndex = currentIndex + offset
    if (targetIndex < 0 || targetIndex >= orderedUrls.length) return
    moveApp(url, targetIndex)
  }

  return (
    <PageContainer size="wide">
      <div className="mb-4">
        <h1 className="mb-1 text-2xl font-semibold text-brand-700">앱보관함</h1>
        <p className="text-sm text-gray-500">
          {isReordering ? '카드를 드래그하거나 화살표로 순서를 바꾸세요.' : '직접 만든 다른 앱들을 바로 열어볼 수 있습니다.'}
        </p>
      </div>

      {/* 검색창과 순서 변경 버튼을 한 줄에 — 검색창은 모바일에서 남는 폭을 모두
          차지하고(flex-1), sm 이상에서는 max-w-xs로 멈춰서 버튼과 함께 자연스럽게
          정렬된다. 재정렬 중엔 검색창이 숨는데(인덱스 꼬임 방지), 이때도 버튼은
          ml-auto로 항상 같은 오른쪽 자리를 지킨다. */}
      <div className="mb-4 flex items-center gap-2">
        {!isReordering && (
          <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 sm:max-w-xs sm:flex-none">
            <Search size={16} className="shrink-0 text-gray-400" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="앱 이름 검색..."
              aria-label="앱 검색"
              className="w-full min-w-0 text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setIsReordering((previous) => !previous)
            setQuery('')
          }}
          className={`${secondaryButtonClass} ml-auto inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3`}
        >
          {isReordering && <Check size={16} aria-hidden="true" />}
          {isReordering ? '완료' : '순서 변경'}
        </button>
      </div>

      {!isReordering && query.trim() && visibleApps.length === 0 && (
        <p className="mb-4 text-sm text-gray-500">'{query.trim()}'와(과) 일치하는 앱이 없습니다.</p>
      )}

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
        {visibleApps.map((app, index) => (
          <div
            key={app.url}
            draggable={isReordering}
            onDragStart={(event) => {
              if (!isReordering) return
              event.dataTransfer.effectAllowed = 'move'
              setDraggedUrl(app.url)
            }}
            onDragOver={(event) => {
              if (!isReordering) return
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(event) => {
              event.preventDefault()
              if (isReordering && draggedUrl) moveApp(draggedUrl, index)
              setDraggedUrl(null)
            }}
            onDragEnd={() => setDraggedUrl(null)}
            className={`${sectionCardClass} relative p-0 ${
              isReordering
                ? 'border-brand-300 bg-brand-50/40'
                : 'transition-transform hover:-translate-y-0.5'
            } ${draggedUrl === app.url ? 'opacity-50' : ''}`}
          >
            {isReordering && <GripVertical className="absolute left-2 top-2 text-brand-500" size={18} aria-hidden="true" />}
            <a
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                if (isReordering) {
                  event.preventDefault()
                  return
                }
                if (app.integration !== 'student-roster') return
                event.preventDefault()
                if (!loading) openRandomDrawWithRoster(students)
              }}
              className="flex flex-col items-center gap-1.5 px-2 py-3 text-center md:gap-2 md:px-3 md:py-4"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 md:h-11 md:w-11">
                <app.icon size={18} className="md:h-5 md:w-5" aria-hidden="true" />
              </span>
              {/* 2줄까지 줄바꿈 허용 — 앱 이름이 계속 늘어날 걸 감안해 잘려서 안 보이는 것보단 카드가
                  살짝 높아지는 편이 낫다. min-h(em 단위라 폰트 크기에 맞춰 함께 커짐)로 짧은 이름 카드도
                  높이를 맞춰 그리드가 고르게 보이게 하고, title로 2줄을 넘는 이름도 (데스크톱에서는)
                  마우스오버로 전체를 확인할 수 있게 한다. 모바일 3열에서도 안 잘리는 걸 확인한 크기라
                  breakpoint 구분 없이 text-sm 하나로 통일. */}
              <span
                title={app.name}
                className="line-clamp-2 min-h-[2.1em] w-full text-sm font-medium leading-tight text-gray-900"
              >
                {app.name}
              </span>
            </a>
            {isReordering && (
              <div className="absolute right-2 top-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => moveAppBy(app.url, -1)}
                  disabled={index === 0}
                  aria-label={`${app.name} 위로 이동`}
                  className="rounded-md p-1 text-brand-700 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronUp size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => moveAppBy(app.url, 1)}
                  disabled={index === orderedApps.length - 1}
                  aria-label={`${app.name} 아래로 이동`}
                  className="rounded-md p-1 text-brand-700 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronDown size={18} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </PageContainer>
  )
}
