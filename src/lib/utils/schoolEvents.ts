import type { SchoolEvent, SchoolEventByDate } from '../types'

export function isEventRelevantToGrade(event: SchoolEvent, grade: string): boolean {
  return event.isSchoolWide || event.grades.includes(grade)
}

export function filterEventsForGrade(events: SchoolEvent[], grade: string): SchoolEvent[] {
  return events.filter((event) => isEventRelevantToGrade(event, grade))
}

export function filterEventsByDateForGrade(eventsByDate: SchoolEventByDate, grade: string): SchoolEventByDate {
  const result: SchoolEventByDate = {}
  for (const [date, events] of Object.entries(eventsByDate)) {
    const filtered = filterEventsForGrade(events, grade)
    if (filtered.length > 0) result[date] = filtered
  }
  return result
}

/**
 * Deliberately narrow keyword list — only flags a day as non-instructional
 * when the event name/type says so explicitly. An ambiguous or unfamiliar
 * event name must never silently block attendance input.
 */
const NON_INSTRUCTIONAL_KEYWORDS = ['방학', '휴업', '휴교', '공휴일']

export function isNonInstructionalDay(events: SchoolEvent[]): boolean {
  return events.some((event) =>
    NON_INSTRUCTIONAL_KEYWORDS.some((keyword) => event.name.includes(keyword) || event.type.includes(keyword)),
  )
}

/** "행사명" (1건) or "행사명 외 N건" (2건 이상) — never truncates the first event's own name here. */
export function summarizeEventBadge(events: SchoolEvent[]): string {
  if (events.length === 0) return ''
  if (events.length === 1) return events[0].name
  return `${events[0].name} 외 ${events.length - 1}건`
}

export function gradeScopeLabel(event: SchoolEvent): string {
  if (event.isSchoolWide) return '전교'
  return event.grades.map((g) => `${g}학년`).join(', ')
}
