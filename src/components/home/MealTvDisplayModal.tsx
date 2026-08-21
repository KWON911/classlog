import { useEffect, useRef, useState } from 'react'
import { dateFromYmd, formatClockDateLine } from '../../lib/utils/date-utils'
import { stripAllergyCode } from '../../lib/services/neis-service'
import { emojiForMenuItem } from '../../lib/utils/mealEmoji'
import type { WeeklyMealDay } from '../../lib/types'

type MealTvDisplayModalProps = {
  days: WeeklyMealDay[]
  initialIndex: number
  onClose: () => void
}

export function MealTvDisplayModal({ days, initialIndex, onClose }: MealTvDisplayModalProps) {
  const [index, setIndex] = useState(initialIndex)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const day = days[index]

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(days.length - 1, i + 1))
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, days.length])

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-label={`${day.dayLabel}요일 식단표`}
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 sm:px-10">
        <p className="text-2xl font-bold text-gray-900 sm:text-3xl">
          {formatClockDateLine(dateFromYmd(day.date))}
        </p>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="식단표 닫기"
          className="flex h-14 w-14 items-center justify-center rounded-full text-3xl text-gray-500 transition-colors hover:bg-gray-100"
        >
          ✕
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-6 sm:px-10">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          aria-label="이전 요일"
          className="absolute left-2 top-1/2 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full text-4xl text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 sm:left-6"
        >
          ‹
        </button>

        <div className="mx-16 w-full max-w-3xl text-center sm:mx-24">
          {day.menus.length === 0 ? (
            <p className="text-3xl text-gray-400 sm:text-4xl">오늘은 급식 정보가 없어요 🍽️</p>
          ) : (
            <ul className="flex flex-col gap-6">
              {day.menus.map((menu, i) => {
                const stripped = stripAllergyCode(menu)
                return (
                  <li key={i} className="text-4xl font-semibold text-gray-900 sm:text-5xl [word-break:keep-all]">
                    <span className="mr-3">{emojiForMenuItem(stripped)}</span>
                    {stripped}
                  </li>
                )
              })}
            </ul>
          )}
          {day.calorie && <p className="mt-8 text-lg text-gray-400 sm:text-xl">{day.calorie}</p>}
        </div>

        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(days.length - 1, i + 1))}
          disabled={index === days.length - 1}
          aria-label="다음 요일"
          className="absolute right-2 top-1/2 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full text-4xl text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 sm:right-6"
        >
          ›
        </button>
      </div>
    </div>
  )
}
