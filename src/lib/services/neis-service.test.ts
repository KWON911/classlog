import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildWeeklyMeal,
  buildWeeklyTimetable,
  fetchMeals,
  fetchTimetable,
  getMealsForRange,
  getTimetableForRange,
  searchSchools,
  stripAllergyCode,
} from './neis-service'
import type { SchoolSettings } from '../types'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const settings: SchoolSettings = {
  teacher_id: 't1',
  office_code: 'E10',
  school_code: '7341401',
  school_name: '인천예송초등학교',
  school_year: '2026',
  grade: '6',
  class_name: '1',
  updated_at: '2026-08-01T00:00:00Z',
}

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response)
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('fetchTimetable', () => {
  it('parses rows into a date-keyed, period-sorted map', async () => {
    mockFetch.mockReturnValue(
      jsonResponse({
        elsTimetable: [
          {},
          {
            row: [
              { ALL_TI_YMD: '20260804', PERIO: '2', ITRT_CNTNT: '수학' },
              { ALL_TI_YMD: '20260804', PERIO: '1', ITRT_CNTNT: '국어<br/>' },
            ],
          },
        ],
      }),
    )

    const result = await fetchTimetable(settings, '202608')

    // Regression test: pIndex/pSize were missing entirely on the first port
    // from school_manage, so NEIS silently paginated elsTimetable down to
    // just the first couple of rows (reported as "only Monday's first two
    // periods show, the rest are '-'"). This must always be sent explicitly.
    const requestedUrl = new URL(mockFetch.mock.calls[0][0], 'http://localhost')
    expect(requestedUrl.searchParams.get('pIndex')).toBe('1')
    expect(requestedUrl.searchParams.get('pSize')).toBe('1000')

    expect(result.error).toBeNull()
    expect(result.data?.['20260804']).toEqual([
      { period: 1, subject: '국어' },
      { period: 2, subject: '수학' },
    ])
  })

  it('drops a row with blank ITRT_CNTNT instead of fabricating a placeholder subject', async () => {
    // Observed against real NEIS data: the last two weekdays before a
    // school break can come back with rows for every period slot but an
    // empty ITRT_CNTNT — must not paper over that with a fake "수업" label.
    mockFetch.mockReturnValue(
      jsonResponse({
        elsTimetable: [
          {},
          {
            row: [
              { ALL_TI_YMD: '20260202', PERIO: '1', ITRT_CNTNT: '국어' },
              { ALL_TI_YMD: '20260202', PERIO: '2', ITRT_CNTNT: '' },
              { ALL_TI_YMD: '20260202', PERIO: '3', ITRT_CNTNT: '   ' },
            ],
          },
        ],
      }),
    )

    const result = await fetchTimetable(settings, '202602')

    expect(result.error).toBeNull()
    expect(result.data?.['20260202']).toEqual([{ period: 1, subject: '국어' }])
  })

  it('treats an INFO-200 RESULT (no data) as a valid empty result, not an error', async () => {
    mockFetch.mockReturnValue(jsonResponse({ RESULT: { CODE: 'INFO-200', MESSAGE: '해당하는 데이터가 없습니다.' } }))

    const result = await fetchTimetable(settings, '202601')

    expect(result.error).toBeNull()
    expect(result.data).toEqual({})
  })

  it('treats a non-INFO-200 RESULT as an error', async () => {
    mockFetch.mockReturnValue(jsonResponse({ RESULT: { CODE: 'ERROR-300', MESSAGE: '필수 값이 누락되었습니다.' } }))

    const result = await fetchTimetable(settings, '202609')

    expect(result.data).toBeNull()
    expect(result.error).toBe('필수 값이 누락되었습니다.')
  })

  it('reuses the cached result for the same key instead of calling fetch again', async () => {
    mockFetch.mockReturnValue(jsonResponse({ elsTimetable: [{}, { row: [] }] }))

    await fetchTimetable(settings, '202610')
    await fetchTimetable(settings, '202610')

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('bypasses the cache when force is true', async () => {
    mockFetch.mockReturnValue(jsonResponse({ elsTimetable: [{}, { row: [] }] }))

    await fetchTimetable(settings, '202611')
    await fetchTimetable(settings, '202611', { force: true })

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('does not reuse the cache across different class settings', async () => {
    mockFetch.mockReturnValue(jsonResponse({ elsTimetable: [{}, { row: [] }] }))

    await fetchTimetable(settings, '202612')
    await fetchTimetable({ ...settings, class_name: '2' }, '202612')

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})

describe('getTimetableForRange', () => {
  it('merges data across a month boundary', async () => {
    // Uses a month pair (2027-02/03) not touched by any other test in this
    // file, so the module-level cache from earlier tests can't interfere.
    mockFetch.mockImplementation((input: string) => {
      const url = new URL(input, 'http://localhost')
      const from = url.searchParams.get('TI_FROM_YMD') ?? ''
      if (from.startsWith('202702')) {
        return jsonResponse({ elsTimetable: [{}, { row: [{ ALL_TI_YMD: '20270228', PERIO: '1', ITRT_CNTNT: '국어' }] }] })
      }
      return jsonResponse({ elsTimetable: [{}, { row: [{ ALL_TI_YMD: '20270301', PERIO: '1', ITRT_CNTNT: '수학' }] }] })
    })

    const result = await getTimetableForRange(settings, new Date(2027, 1, 28), new Date(2027, 2, 1))

    expect(result.error).toBeNull()
    expect(Object.keys(result.data ?? {}).sort()).toEqual(['20270228', '20270301'])
  })
})

describe('fetchMeals', () => {
  it('splits DDISH_NM into a menu array', async () => {
    mockFetch.mockReturnValue(
      jsonResponse({
        mealServiceDietInfo: [
          {},
          { row: [{ MLSV_YMD: '20260803', DDISH_NM: '현미밥<br/>미역국<br/>불고기(5.6)', CAL_INFO: '650 Kcal' }] },
        ],
      }),
    )

    const result = await fetchMeals(settings, '202608')

    const requestedUrl = new URL(mockFetch.mock.calls[0][0], 'http://localhost')
    expect(requestedUrl.searchParams.get('pIndex')).toBe('1')
    expect(requestedUrl.searchParams.get('pSize')).toBe('100')

    expect(result.error).toBeNull()
    expect(result.data?.['20260803']).toEqual({
      menus: ['현미밥', '미역국', '불고기(5.6)'],
      calorie: '650 Kcal',
    })
  })

  it('treats an INFO-200 RESULT as a valid empty result', async () => {
    mockFetch.mockReturnValue(jsonResponse({ RESULT: { CODE: 'INFO-200', MESSAGE: '해당하는 데이터가 없습니다.' } }))

    const result = await fetchMeals(settings, '202601')

    expect(result.error).toBeNull()
    expect(result.data).toEqual({})
  })
})

describe('getMealsForRange', () => {
  it('merges data across a month boundary', async () => {
    // Uses a month pair (2027-02/03) not touched by any other meal test in
    // this file, so the module-level cache from earlier tests can't interfere.
    mockFetch.mockImplementation((input: string) => {
      const url = new URL(input, 'http://localhost')
      const from = url.searchParams.get('MLSV_FROM_YMD') ?? ''
      if (from.startsWith('202702')) {
        return jsonResponse({ mealServiceDietInfo: [{}, { row: [{ MLSV_YMD: '20270228', DDISH_NM: '김밥', CAL_INFO: '' }] }] })
      }
      return jsonResponse({ mealServiceDietInfo: [{}, { row: [{ MLSV_YMD: '20270301', DDISH_NM: '라면', CAL_INFO: '' }] }] })
    })

    const result = await getMealsForRange(settings, new Date(2027, 1, 28), new Date(2027, 2, 1))

    expect(result.error).toBeNull()
    expect(Object.keys(result.data ?? {}).sort()).toEqual(['20270228', '20270301'])
  })
})

describe('searchSchools', () => {
  it('maps NEIS rows to the app search-result shape', async () => {
    mockFetch.mockReturnValue(
      jsonResponse({
        schoolInfo: [
          {},
          {
            row: [
              {
                ATPT_OFCDC_SC_CODE: 'E10',
                SD_SCHUL_CODE: '7341401',
                SCHUL_NM: '인천예송초등학교',
                ORG_RDNMA: '인천 연수구',
              },
            ],
          },
        ],
      }),
    )

    const result = await searchSchools('예송')

    expect(result.error).toBeNull()
    expect(result.data).toEqual([
      { office_code: 'E10', school_code: '7341401', school_name: '인천예송초등학교', address: '인천 연수구' },
    ])
  })

  it('returns an empty list for a blank query without calling fetch', async () => {
    const result = await searchSchools('   ')

    expect(result).toEqual({ data: [], error: null })
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('stripAllergyCode', () => {
  it('removes a trailing allergy-number parenthetical', () => {
    expect(stripAllergyCode('된장찌개(5.6.13)')).toBe('된장찌개')
  })

  it('leaves menu names without allergy codes unchanged', () => {
    expect(stripAllergyCode('현미밥')).toBe('현미밥')
  })
})

describe('buildWeeklyTimetable', () => {
  it('fills in each requested day, defaulting to no periods when missing', () => {
    const days = [new Date(2026, 7, 3), new Date(2026, 7, 4)]
    const result = buildWeeklyTimetable(days, { '20260803': [{ period: 1, subject: '국어' }] })

    expect(result).toEqual([
      { date: '20260803', dayLabel: '월', periods: [{ period: 1, subject: '국어' }] },
      { date: '20260804', dayLabel: '화', periods: [] },
    ])
  })
})

describe('buildWeeklyMeal', () => {
  it('fills in each requested day, defaulting to empty menus when missing', () => {
    const days = [new Date(2026, 7, 3), new Date(2026, 7, 4)]
    const result = buildWeeklyMeal(days, { '20260803': { menus: ['현미밥'], calorie: '650 Kcal' } })

    expect(result).toEqual([
      { date: '20260803', dayLabel: '월', menus: ['현미밥'], calorie: '650 Kcal' },
      { date: '20260804', dayLabel: '화', menus: [], calorie: '' },
    ])
  })
})
