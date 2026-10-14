/** Local calendar dates, independent of the browser's UTC offset. */
export function weekdayDatesInRange(start: string, end: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end < start) return []
  const dates: string[] = []
  const cursor = new Date(`${start}T12:00:00Z`)
  const last = new Date(`${end}T12:00:00Z`)
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(last.getTime())) return []
  if (cursor.toISOString().slice(0, 10) !== start || last.toISOString().slice(0, 10) !== end) return []
  if ((last.getTime() - cursor.getTime()) / 86400000 > 30) return []
  while (cursor <= last) {
    const day = cursor.getUTCDay()
    if (day >= 1 && day <= 5) dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}
