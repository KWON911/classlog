import { describe, expect, it } from 'vitest'
import {
  addDays,
  dateFromYmd,
  dayName,
  lastDayOfMonth,
  mondayOf,
  schoolYearOf,
  semesterOf,
  weekdaysOf,
  yyyymm,
  yyyymmdd,
} from './date-utils'

describe('yyyymm', () => {
  it('pads single-digit months', () => {
    expect(yyyymm(new Date(2026, 0, 15))).toBe('202601')
  })
})

describe('yyyymmdd', () => {
  it('pads single-digit months and days', () => {
    expect(yyyymmdd(new Date(2026, 7, 3))).toBe('20260803')
  })
})

describe('dateFromYmd', () => {
  it('parses a YYYYMMDD string back into the same calendar date', () => {
    const d = dateFromYmd('20260803')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(7)
    expect(d.getDate()).toBe(3)
  })
})

describe('addDays', () => {
  it('rolls over into the next month', () => {
    const d = addDays(new Date(2026, 6, 30), 3)
    expect(yyyymmdd(d)).toBe('20260802')
  })

  it('supports negative offsets', () => {
    const d = addDays(new Date(2026, 7, 3), -3)
    expect(yyyymmdd(d)).toBe('20260731')
  })
})

describe('mondayOf', () => {
  it('returns the same date when already Monday', () => {
    // 2026-08-03 is a Monday
    expect(yyyymmdd(mondayOf(new Date(2026, 7, 3)))).toBe('20260803')
  })

  it('returns the prior Monday for a mid-week date', () => {
    // 2026-08-06 is a Thursday
    expect(yyyymmdd(mondayOf(new Date(2026, 7, 6)))).toBe('20260803')
  })

  it('treats Sunday as the last day of the same Mon-Sun week', () => {
    // 2026-08-09 is a Sunday, belongs to the week starting 2026-08-03
    expect(yyyymmdd(mondayOf(new Date(2026, 7, 9)))).toBe('20260803')
  })
})

describe('lastDayOfMonth', () => {
  it('handles a 31-day month', () => {
    expect(lastDayOfMonth('202608')).toBe(31)
  })

  it('handles February in a leap year', () => {
    expect(lastDayOfMonth('202802')).toBe(29)
  })
})

describe('schoolYearOf', () => {
  it('keeps the calendar year for March through December', () => {
    expect(schoolYearOf(new Date(2026, 7, 15))).toBe('2026')
  })

  it('rolls January/February back to the previous school year', () => {
    expect(schoolYearOf(new Date(2027, 0, 15))).toBe('2026')
    expect(schoolYearOf(new Date(2027, 1, 15))).toBe('2026')
  })
})

describe('semesterOf', () => {
  it('is semester 1 for March through August', () => {
    expect(semesterOf(new Date(2026, 2, 1))).toBe('1')
    expect(semesterOf(new Date(2026, 7, 31))).toBe('1')
  })

  it('is semester 2 for September through February', () => {
    expect(semesterOf(new Date(2026, 8, 1))).toBe('2')
    expect(semesterOf(new Date(2027, 1, 28))).toBe('2')
  })
})

describe('dayName', () => {
  it('returns the Korean weekday label', () => {
    expect(dayName(new Date(2026, 7, 3))).toBe('월')
    expect(dayName(new Date(2026, 7, 7))).toBe('금')
  })
})

describe('weekdaysOf', () => {
  it('returns Monday through Friday of the reference date\'s week', () => {
    const days = weekdaysOf(new Date(2026, 7, 6)) // Thursday
    expect(days.map(yyyymmdd)).toEqual(['20260803', '20260804', '20260805', '20260806', '20260807'])
  })

  it('handles a week that spans two months', () => {
    // 2026-08-31 is a Monday; the same week runs into September
    const days = weekdaysOf(new Date(2026, 7, 31))
    expect(days.map(yyyymmdd)).toEqual(['20260831', '20260901', '20260902', '20260903', '20260904'])
  })
})
