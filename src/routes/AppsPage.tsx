import { Check, ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
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
  const orderedApps = useMemo(
    () => orderedUrls.map((url) => appByUrl.get(url)).filter((app): app is MyApp => Boolean(app)),
    [orderedUrls],
  )

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
    <PageContainer size="standard">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-brand-700">앱보관함</h1>
          <p className="text-sm text-gray-500">
            {isReordering ? '카드를 드래그하거나 화살표로 순서를 바꾸세요.' : '직접 만든 다른 앱들을 바로 열어볼 수 있습니다.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsReordering((previous) => !previous)}
          className={`${secondaryButtonClass} inline-flex shrink-0 items-center gap-1.5 px-3`}
        >
          {isReordering && <Check size={16} aria-hidden="true" />}
          {isReordering ? '완료' : '순서 변경'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {orderedApps.map((app, index) => (
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
              className="flex flex-col items-center gap-2 px-5 py-6 text-center"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <app.icon size={24} aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-gray-900">{app.name}</span>
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
