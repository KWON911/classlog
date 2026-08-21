/** Ported from school_manage (KWON911/school_manage) date helpers — same calculations, TypeScript. */

export function yyyymm(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function yyyymmdd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

export function yyyymmddDash(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function dateFromYmd(ds: string): Date {
  return new Date(parseInt(ds.slice(0, 4), 10), parseInt(ds.slice(4, 6), 10) - 1, parseInt(ds.slice(6, 8), 10))
}

export function addDays(d: Date, amount: number): Date {
  const n = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  n.setDate(n.getDate() + amount)
  return n
}

export function mondayOf(d: Date): Date {
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = base.getDay() === 0 ? -6 : 1 - base.getDay()
  base.setDate(base.getDate() + diff)
  return base
}

export function lastDayOfMonth(yearMonth: string): number {
  const year = parseInt(yearMonth.slice(0, 4), 10)
  const month = parseInt(yearMonth.slice(4, 6), 10)
  return new Date(year, month, 0).getDate()
}

/** 1~2월은 이전 학년도로 취급 (예: 2027년 1월 → 학년도 2026) */
export function schoolYearOf(d: Date): string {
  return d.getMonth() < 2 ? String(d.getFullYear() - 1) : String(d.getFullYear())
}

/** 3~8월 1학기, 9~2월 2학기 */
export function semesterOf(d: Date): string {
  const m = d.getMonth() + 1
  return m >= 3 && m <= 8 ? '1' : '2'
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

export function dayName(d: Date): string {
  return DAY_NAMES[d.getDay()]
}

/** 현재(또는 기준일 포함) 주의 평일(월~금) 5일. */
export function weekdaysOf(referenceDate: Date): Date[] {
  const monday = mondayOf(referenceDate)
  return Array.from({ length: 5 }, (_, i) => addDays(monday, i))
}

/** 예: "2026년 8월 20일 (목)" */
export function formatClockDateLine(d: Date): string {
  const weekday = `(${dayName(d)})`
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${weekday}`
}

/** 예: "오후 3:42:17" */
export function formatClockTimeLine(d: Date): string {
  const ampm = d.getHours() < 12 ? '오전' : '오후'
  const hours12 = d.getHours() % 12 || 12
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  return `${ampm} ${hours12}:${minutes}:${seconds}`
}

/** 예: "2026년 8월 20일 (목) 오후 3:42:17" */
export function formatClockDisplay(d: Date): string {
  return `${formatClockDateLine(d)} ${formatClockTimeLine(d)}`
}
