import { describe, expect, it } from 'vitest'
import {
  filterEventsByDateForGrade,
  filterEventsForGrade,
  gradeScopeLabel,
  isEventRelevantToGrade,
  isNonInstructionalDay,
  summarizeEventBadge,
} from './schoolEvents'
import type { SchoolEvent } from '../types'

function event(overrides: Partial<SchoolEvent>): SchoolEvent {
  return {
    date: '20260803',
    name: '학사일정',
    content: '',
    type: '기타',
    isSchoolWide: false,
    grades: [],
    ...overrides,
  }
}

describe('isEventRelevantToGrade', () => {
  it('is relevant when the event is school-wide, regardless of grade', () => {
    expect(isEventRelevantToGrade(event({ isSchoolWide: true, grades: [] }), '6')).toBe(true)
  })

  it('is relevant when the current grade is in the event grades list', () => {
    expect(isEventRelevantToGrade(event({ isSchoolWide: false, grades: ['6'] }), '6')).toBe(true)
  })

  it('is not relevant when the event targets a different grade only', () => {
    expect(isEventRelevantToGrade(event({ isSchoolWide: false, grades: ['3'] }), '6')).toBe(false)
  })
})

describe('filterEventsForGrade', () => {
  it('keeps school-wide and matching-grade events, drops other-grade-only events', () => {
    const events = [
      event({ name: '전교 행사', isSchoolWide: true }),
      event({ name: '6학년 행사', grades: ['6'] }),
      event({ name: '3학년 행사', grades: ['3'] }),
    ]
    expect(filterEventsForGrade(events, '6').map((e) => e.name)).toEqual(['전교 행사', '6학년 행사'])
  })
})

describe('filterEventsByDateForGrade', () => {
  it('drops dates that have no relevant events after filtering', () => {
    const byDate = {
      '20260803': [event({ name: '6학년 행사', grades: ['6'] })],
      '20260804': [event({ name: '3학년 행사', grades: ['3'] })],
    }
    const result = filterEventsByDateForGrade(byDate, '6')
    expect(Object.keys(result)).toEqual(['20260803'])
  })
})

describe('isNonInstructionalDay', () => {
  it('flags an explicit 방학 event', () => {
    expect(isNonInstructionalDay([event({ name: '여름방학' })])).toBe(true)
  })

  it('flags an explicit 휴업일 event via the type field', () => {
    expect(isNonInstructionalDay([event({ name: '학교 자율 결정일', type: '재량휴업일' })])).toBe(true)
  })

  it('does not flag an ordinary, ambiguous event name', () => {
    expect(isNonInstructionalDay([event({ name: '현장체험학습', type: '체험학습' })])).toBe(false)
  })

  it('returns false for no events', () => {
    expect(isNonInstructionalDay([])).toBe(false)
  })
})

describe('summarizeEventBadge', () => {
  it('returns an empty string for no events', () => {
    expect(summarizeEventBadge([])).toBe('')
  })

  it('returns the event name alone when there is exactly one', () => {
    expect(summarizeEventBadge([event({ name: '개학식' })])).toBe('개학식')
  })

  it('appends "외 N건" when there is more than one', () => {
    const events = [event({ name: '현장체험학습' }), event({ name: '학년 협의회' }), event({ name: '급식 없음' })]
    expect(summarizeEventBadge(events)).toBe('현장체험학습 외 2건')
  })
})

describe('gradeScopeLabel', () => {
  it('labels a school-wide event as 전교', () => {
    expect(gradeScopeLabel(event({ isSchoolWide: true, grades: [] }))).toBe('전교')
  })

  it('labels a grade-specific event with its grade numbers', () => {
    expect(gradeScopeLabel(event({ isSchoolWide: false, grades: ['5', '6'] }))).toBe('5학년, 6학년')
  })
})
