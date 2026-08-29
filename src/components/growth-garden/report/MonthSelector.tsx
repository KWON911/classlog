import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  currentYearMonth,
  formatMonthLabel,
  isFutureMonth,
  isSameMonth,
  shiftMonth,
  type YearMonth,
} from '../../../lib/growth-garden/monthlyReport'

type MonthSelectorProps = {
  value: YearMonth
  onChange: (next: YearMonth) => void
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

/**
 * 월 선택 — 화살표로 한 달씩, 가운데 라벨을 눌러 먼 달로 한 번에.
 *
 * 연·월 드롭다운 두 개를 따로 두면 화살표와 하는 일이 겹쳐 컨트롤만 늘어난다.
 * 그래서 지금 보고 있는 달 라벨 자체가 선택 창을 여는 버튼이다.
 * 미래 달은 기록이 있을 수 없으므로 어느 경로로도 고를 수 없다.
 */
export function MonthSelector({ value, onChange }: MonthSelectorProps) {
  const now = new Date()
  const thisMonth = currentYearMonth(now)
  const nextMonth = shiftMonth(value, 1)
  const nextDisabled = isFutureMonth(nextMonth, now)
  const isThisMonth = isSameMonth(value, thisMonth)

  const [open, setOpen] = useState(false)
  // 선택 창 안에서 보고 있는 연도 — 실제 선택은 월을 누를 때만 반영된다.
  const [pickerYear, setPickerYear] = useState(value.year)
  const containerRef = useRef<HTMLDivElement>(null)

  function openPicker() {
    setPickerYear(value.year)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative flex flex-wrap items-center gap-2">
      <div className="flex h-9 items-center overflow-hidden rounded-lg border border-gray-300 bg-white">
        <button
          type="button"
          onClick={() => onChange(shiftMonth(value, -1))}
          aria-label="이전 달"
          className="flex h-full w-9 items-center justify-center text-gray-600 transition-colors hover:bg-gray-50"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => (open ? setOpen(false) : openPicker())}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`${formatMonthLabel(value)} — 다른 달 고르기`}
          className="h-full min-w-[112px] px-2 text-center text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50"
        >
          {formatMonthLabel(value)}
        </button>

        <button
          type="button"
          onClick={() => onChange(nextMonth)}
          disabled={nextDisabled}
          aria-label="다음 달"
          className="flex h-full w-9 items-center justify-center text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      {!isThisMonth && (
        <button
          type="button"
          onClick={() => onChange(thisMonth)}
          className="h-9 rounded-lg border border-brand-200 bg-white px-3 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
        >
          이번 달로
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="월 선택"
          className="absolute left-0 top-11 z-30 w-64 rounded-xl border border-gray-200 bg-white p-3"
          style={{ boxShadow: '0 12px 32px -8px rgba(15, 23, 42, 0.18)' }}
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPickerYear((year) => year - 1)}
              aria-label="이전 연도"
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <span className="text-sm font-semibold text-gray-900">{pickerYear}년</span>
            <button
              type="button"
              onClick={() => setPickerYear((year) => year + 1)}
              disabled={pickerYear >= thisMonth.year}
              aria-label="다음 연도"
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {MONTHS.map((month) => {
              const candidate = { year: pickerYear, month }
              const disabled = isFutureMonth(candidate, now)
              const selected = isSameMonth(candidate, value)
              return (
                <button
                  key={month}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => {
                    onChange(candidate)
                    setOpen(false)
                  }}
                  className={`h-9 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                    selected ? 'bg-brand-600 text-white' : 'text-gray-700 hover:bg-brand-50'
                  }`}
                >
                  {month}월
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
