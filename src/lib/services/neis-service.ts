/**
 * NEIS 시간표/급식 조회 — school_manage(KWON911/school_manage)의
 * fetchTimetable/getTimetableForRange/fetchMeals 로직을 그대로 옮기되,
 * NEIS API 키를 직접 다루지 않고 서버 프록시(/api/neis)를 거친다.
 */
import { dayName, lastDayOfMonth, schoolYearOf, semesterOf, yyyymm, yyyymmdd } from '../utils/date-utils'
import type {
  MealByDate,
  NeisSchoolSearchResult,
  SchoolEventByDate,
  SchoolSettings,
  TimetableByDate,
  WeeklyMealDay,
  WeeklyTimetableDay,
} from '../types'

type FetchResult<T> = { data: T; error: null } | { data: null; error: string }

type NeisResultBlock = { CODE?: string; MESSAGE?: string }

const timetableCache = new Map<string, TimetableByDate>()
const mealCache = new Map<string, MealByDate>()
const schoolEventCache = new Map<string, SchoolEventByDate>()

/** ONE_GRADE_EVENT_YN..SIX_GRADE_EVENT_YN, in grade order. */
const GRADE_EVENT_KEYS: [string, string][] = [
  ['1', 'ONE_GRADE_EVENT_YN'],
  ['2', 'TW_GRADE_EVENT_YN'],
  ['3', 'THREE_GRADE_EVENT_YN'],
  ['4', 'FR_GRADE_EVENT_YN'],
  ['5', 'FIV_GRADE_EVENT_YN'],
  ['6', 'SIX_GRADE_EVENT_YN'],
]

/**
 * Ported from school_manage's gradeScopeText: an event with none of the six
 * flags set (no grade info given) or all six set (genuinely school-wide) is
 * treated identically as "전체" — same simplification as the reference.
 */
function gradeScopeFromRow(r: Record<string, string>): { selected: string[]; isSchoolWide: boolean } {
  const selected = GRADE_EVENT_KEYS.filter(([, key]) => r[key] === 'Y').map(([grade]) => grade)
  const isSchoolWide = selected.length === 0 || selected.length === 6
  return { selected: isSchoolWide ? [] : selected, isSchoolWide }
}

function isNoDataResult(result: NeisResultBlock): boolean {
  return String(result.CODE ?? '').startsWith('INFO-200')
}

async function callNeis(endpoint: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const search = new URLSearchParams({ endpoint, ...params })
  const res = await fetch(`/api/neis?${search.toString()}`)
  if (!res.ok) {
    let message = '정보를 불러오지 못했습니다.'
    try {
      const body = (await res.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      // response body wasn't JSON — keep the default message
    }
    throw new Error(message)
  }
  return res.json()
}

export async function fetchTimetable(
  settings: SchoolSettings,
  yearMonth: string,
  options?: { force?: boolean },
): Promise<FetchResult<TimetableByDate>> {
  const monthDate = new Date(parseInt(yearMonth.slice(0, 4), 10), parseInt(yearMonth.slice(4, 6), 10) - 1, 15)
  const ay = schoolYearOf(monthDate)
  const sem = semesterOf(monthDate)
  const cacheKey = `${settings.school_code}_${settings.grade}_${settings.class_name}_${yearMonth}_${ay}_${sem}`

  if (!options?.force && timetableCache.has(cacheKey)) {
    return { data: timetableCache.get(cacheKey)!, error: null }
  }

  const lastDay = lastDayOfMonth(yearMonth)

  try {
    const json = await callNeis('elsTimetable', {
      ATPT_OFCDC_SC_CODE: settings.office_code,
      SD_SCHUL_CODE: settings.school_code,
      AY: ay,
      SEM: sem,
      GRADE: settings.grade,
      CLASS_NM: settings.class_name,
      TI_FROM_YMD: `${yearMonth}01`,
      TI_TO_YMD: `${yearMonth}${String(lastDay).padStart(2, '0')}`,
      // NEIS silently paginates when these are omitted — a month of
      // elsTimetable rows (weekdays x periods) can exceed its default page
      // size, which is what caused the "only Monday's first two periods"
      // bug. Matches the pSize school_manage (the reference repo) used.
      pIndex: '1',
      pSize: '1000',
    })

    const result = json.RESULT as NeisResultBlock | undefined
    if (result) {
      if (isNoDataResult(result)) {
        if (import.meta.env.DEV) {
          console.debug('[neis-service] fetchTimetable: no data', { yearMonth, ay, sem, cacheKey })
        }
        timetableCache.set(cacheKey, {})
        return { data: {}, error: null }
      }
      return { data: null, error: result.MESSAGE ?? '시간표를 불러오지 못했습니다.' }
    }

    const elsTimetable = json.elsTimetable as [{ head?: Record<string, unknown>[] }, { row?: Record<string, string>[] }] | undefined
    const rows = elsTimetable?.[1]?.row ?? []
    const map: TimetableByDate = {}
    for (const r of rows) {
      const ds = r.ALL_TI_YMD
      if (!ds) continue
      const period = parseInt(r.PERIO || '0', 10) || 0
      const subject = (r.ITRT_CNTNT || '').replace(/<br\/?\s*>/gi, ' ').trim()
      // NEIS sometimes returns a row for a period slot with a genuinely
      // blank ITRT_CNTNT (observed on the last two weekdays before a
      // school break). Falling back to a placeholder like "수업" here
      // would fabricate a subject that was never actually there — skip
      // the row instead, same as if NEIS hadn't returned it at all.
      if (!subject) continue
      ;(map[ds] ??= []).push({ period, subject })
    }
    for (const list of Object.values(map)) {
      list.sort((a, b) => a.period - b.period)
    }

    if (import.meta.env.DEV) {
      const head = elsTimetable?.[0]?.head as { list_total_count?: number }[] | undefined
      console.debug(
        '[neis-service] fetchTimetable diagnostics',
        JSON.stringify({
          yearMonth,
          officeCode: settings.office_code,
          schoolCode: settings.school_code,
          ay,
          sem,
          grade: settings.grade,
          classNm: settings.class_name,
          totalCountFromNeis: head?.find((h) => h.list_total_count !== undefined)?.list_total_count,
          rawRowCount: rows.length,
          rawRowSample: rows.slice(0, 10),
          dates: Object.keys(map)
            .sort()
            .map((ds) => `${ds}: ${map[ds].length} rows / periods ${map[ds].map((p) => p.period).join(',')}`),
        }),
      )
    }

    timetableCache.set(cacheKey, map)
    return { data: map, error: null }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : '시간표를 불러오지 못했습니다.' }
  }
}

export async function getTimetableForRange(
  settings: SchoolSettings,
  startDate: Date,
  endDate: Date,
  options?: { force?: boolean },
): Promise<FetchResult<TimetableByDate>> {
  const map: TimetableByDate = {}
  let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  const endCursor = new Date(endDate.getFullYear(), endDate.getMonth(), 1)

  while (cursor <= endCursor) {
    const result = await fetchTimetable(settings, yyyymm(cursor), options)
    if (result.error) return result
    Object.assign(map, result.data)
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }

  return { data: map, error: null }
}

export async function fetchMeals(
  settings: SchoolSettings,
  yearMonth: string,
  options?: { force?: boolean },
): Promise<FetchResult<MealByDate>> {
  const cacheKey = `${settings.school_code}_${yearMonth}`

  if (!options?.force && mealCache.has(cacheKey)) {
    return { data: mealCache.get(cacheKey)!, error: null }
  }

  const lastDay = lastDayOfMonth(yearMonth)

  try {
    const json = await callNeis('mealServiceDietInfo', {
      ATPT_OFCDC_SC_CODE: settings.office_code,
      SD_SCHUL_CODE: settings.school_code,
      MLSV_FROM_YMD: `${yearMonth}01`,
      MLSV_TO_YMD: `${yearMonth}${String(lastDay).padStart(2, '0')}`,
      pIndex: '1',
      pSize: '100',
    })

    const result = json.RESULT as NeisResultBlock | undefined
    if (result) {
      if (isNoDataResult(result)) {
        mealCache.set(cacheKey, {})
        return { data: {}, error: null }
      }
      return { data: null, error: result.MESSAGE ?? '급식 정보를 불러오지 못했습니다.' }
    }

    const mealServiceDietInfo = json.mealServiceDietInfo as
      | [unknown, { row?: Record<string, string>[] }]
      | undefined
    const rows = mealServiceDietInfo?.[1]?.row ?? []
    const map: MealByDate = {}
    for (const r of rows) {
      const menus = String(r.DDISH_NM || '')
        .split('<br/>')
        .map((m) => m.trim())
        .filter(Boolean)
      map[r.MLSV_YMD] = { menus, calorie: r.CAL_INFO || '' }
    }

    mealCache.set(cacheKey, map)
    return { data: map, error: null }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : '급식 정보를 불러오지 못했습니다.' }
  }
}

export async function getMealsForRange(
  settings: SchoolSettings,
  startDate: Date,
  endDate: Date,
  options?: { force?: boolean },
): Promise<FetchResult<MealByDate>> {
  const map: MealByDate = {}
  let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  const endCursor = new Date(endDate.getFullYear(), endDate.getMonth(), 1)

  while (cursor <= endCursor) {
    const result = await fetchMeals(settings, yyyymm(cursor), options)
    if (result.error) return result
    Object.assign(map, result.data)
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }

  return { data: map, error: null }
}

export async function searchSchools(query: string): Promise<FetchResult<NeisSchoolSearchResult[]>> {
  if (!query.trim()) return { data: [], error: null }

  try {
    const json = await callNeis('schoolInfo', {
      SCHUL_NM: query,
      SCHUL_KND_SC_NM: '초등학교',
      pIndex: '1',
      pSize: '20',
    })

    const result = json.RESULT as NeisResultBlock | undefined
    if (result) {
      if (isNoDataResult(result)) return { data: [], error: null }
      return { data: null, error: result.MESSAGE ?? '학교를 검색하지 못했습니다.' }
    }

    const schoolInfo = json.schoolInfo as [unknown, { row?: Record<string, string>[] }] | undefined
    const rows = schoolInfo?.[1]?.row ?? []
    return {
      data: rows.map((r) => ({
        office_code: r.ATPT_OFCDC_SC_CODE,
        school_code: r.SD_SCHUL_CODE,
        school_name: r.SCHUL_NM,
        address: r.ORG_RDNMA || r.LCTN_SC_NM || '',
      })),
      error: null,
    }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : '학교를 검색하지 못했습니다.' }
  }
}

export async function fetchSchoolEvents(
  settings: SchoolSettings,
  yearMonth: string,
  options?: { force?: boolean },
): Promise<FetchResult<SchoolEventByDate>> {
  const cacheKey = `${settings.school_code}_${yearMonth}`

  if (!options?.force && schoolEventCache.has(cacheKey)) {
    return { data: schoolEventCache.get(cacheKey)!, error: null }
  }

  const lastDay = lastDayOfMonth(yearMonth)

  try {
    const json = await callNeis('SchoolSchedule', {
      ATPT_OFCDC_SC_CODE: settings.office_code,
      SD_SCHUL_CODE: settings.school_code,
      AA_FROM_YMD: `${yearMonth}01`,
      AA_TO_YMD: `${yearMonth}${String(lastDay).padStart(2, '0')}`,
      pIndex: '1',
      pSize: '100',
    })

    const result = json.RESULT as NeisResultBlock | undefined
    if (result) {
      if (isNoDataResult(result)) {
        schoolEventCache.set(cacheKey, {})
        return { data: {}, error: null }
      }
      return { data: null, error: result.MESSAGE ?? '학사일정을 불러오지 못했습니다.' }
    }

    const schoolSchedule = json.SchoolSchedule as [unknown, { row?: Record<string, string>[] }] | undefined
    const rows = schoolSchedule?.[1]?.row ?? []
    const map: SchoolEventByDate = {}
    for (const r of rows) {
      const date = r.AA_YMD
      if (!date) continue
      const { selected, isSchoolWide } = gradeScopeFromRow(r)
      ;(map[date] ??= []).push({
        date,
        name: r.EVENT_NM || '학사일정',
        content: r.EVENT_CNTNT || '',
        type: r.EVENT_CRGR_SC_NM || '학사일정',
        isSchoolWide,
        grades: selected,
      })
    }
    for (const list of Object.values(map)) {
      list.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    }

    schoolEventCache.set(cacheKey, map)
    return { data: map, error: null }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : '학사일정을 불러오지 못했습니다.' }
  }
}

/** 메뉴명 뒤에 붙는 알레르기 번호 괄호, 예: "된장찌개(5.6.13)" -> "된장찌개" */
export function stripAllergyCode(menu: string): string {
  return menu.replace(/\([^)]*\)/g, '').trim()
}

export function buildWeeklyTimetable(days: Date[], data: TimetableByDate): WeeklyTimetableDay[] {
  return days.map((d) => {
    const ds = yyyymmdd(d)
    return { date: ds, dayLabel: dayName(d), periods: data[ds] ?? [] }
  })
}

export function buildWeeklyMeal(days: Date[], data: MealByDate): WeeklyMealDay[] {
  return days.map((d) => {
    const ds = yyyymmdd(d)
    const info = data[ds]
    return { date: ds, dayLabel: dayName(d), menus: info?.menus ?? [], calorie: info?.calorie ?? '' }
  })
}
