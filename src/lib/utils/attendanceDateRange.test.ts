import { describe, expect, it } from 'vitest'
import { weekdayDatesInRange } from './attendanceDateRange'

describe('weekdayDatesInRange', () => {
  it('includes school weekdays across a month boundary and skips the weekend', () => {
    expect(weekdayDatesInRange('2026-10-30', '2026-11-03')).toEqual([
      '2026-10-30', '2026-11-02', '2026-11-03',
    ])
  })

  it('rejects reversed, invalid, and overly long ranges', () => {
    expect(weekdayDatesInRange('2026-11-03', '2026-10-30')).toEqual([])
    expect(weekdayDatesInRange('2026-02-30', '2026-03-03')).toEqual([])
    expect(weekdayDatesInRange('2026-10-01', '2026-11-02')).toEqual([])
  })
})
