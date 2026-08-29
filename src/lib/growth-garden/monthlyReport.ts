/**
 * 월별 리포트 집계 — React/Supabase 의존 없는 순수 모듈.
 *
 * 리포트는 전부 기존 상벌점 기록에서 파생한다(별도 통계 테이블 없음).
 * 월 경계는 문자열 비교가 아니라 로컬 시각 기준 [해당 월 1일 00:00, 다음 달 1일 00:00)
 * 범위로 계산한다 — created_at이 timestamptz라 substring 비교는 시차에서 틀어진다.
 */
import type { GrowthPointEntry } from '../types'
import { summarizeByStudent, stageForScore, type GardenSummary } from './growth'
import { calculateGardenEnvironment, type GardenEnvironment } from './environment'
import type { GrowthStage } from './constants'

export type YearMonth = { year: number; month: number }

export function currentYearMonth(now: Date = new Date()): YearMonth {
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const base = new Date(year, month - 1 + delta, 1)
  return { year: base.getFullYear(), month: base.getMonth() + 1 }
}

export function isSameMonth(a: YearMonth, b: YearMonth): boolean {
  return a.year === b.year && a.month === b.month
}

/** 미래 달인지 — 다음 달 버튼을 막는 데 쓴다. */
export function isFutureMonth(target: YearMonth, now: Date = new Date()): boolean {
  const current = currentYearMonth(now)
  return target.year > current.year || (target.year === current.year && target.month > current.month)
}

export function formatMonthLabel({ year, month }: YearMonth): string {
  return `${year}년 ${month}월`
}

/** 로컬 시각 기준 [시작, 끝) 범위. ISO 문자열은 그대로 DB 질의에 쓴다. */
export function monthRange(ym: YearMonth): { start: Date; end: Date; startIso: string; endIso: string } {
  const start = new Date(ym.year, ym.month - 1, 1, 0, 0, 0, 0)
  const end = new Date(ym.year, ym.month, 1, 0, 0, 0, 0)
  return { start, end, startIso: start.toISOString(), endIso: end.toISOString() }
}

export function daysInMonth({ year, month }: YearMonth): number {
  return new Date(year, month, 0).getDate()
}

/** 해당 월 기록과 그 이전 기록으로 나눈다(월초 상태 계산에 이전 기록이 필요하다). */
export function splitByMonth(
  entries: GrowthPointEntry[],
  ym: YearMonth,
): { before: GrowthPointEntry[]; inMonth: GrowthPointEntry[] } {
  const { start, end } = monthRange(ym)
  const before: GrowthPointEntry[] = []
  const inMonth: GrowthPointEntry[] = []

  for (const entry of entries) {
    const at = new Date(entry.created_at)
    if (Number.isNaN(at.getTime())) continue
    if (at < start) before.push(entry)
    else if (at < end) inMonth.push(entry)
  }
  return { before, inMonth }
}

export type ReasonTally = { reason: string; count: number; score: number }

function tallyReasons(entries: GrowthPointEntry[]): ReasonTally[] {
  const byReason = new Map<string, ReasonTally>()
  for (const entry of entries) {
    const found = byReason.get(entry.reason)
    if (found) {
      found.count += 1
      found.score += entry.amount
    } else {
      byReason.set(entry.reason, { reason: entry.reason, count: 1, score: entry.amount })
    }
  }
  // 횟수 → 점수 → 이름 순으로 정렬해 같은 데이터면 항상 같은 순서가 되게 한다.
  return [...byReason.values()].sort(
    (a, b) => b.count - a.count || b.score - a.score || a.reason.localeCompare(b.reason),
  )
}

export type MonthlyTotals = {
  meritScore: number
  demeritScore: number
  /** 상점 - 벌점. 학생 개인 점수와 달리 0 하한을 두지 않는다(그 달의 변화량이므로). */
  netScore: number
  meritCount: number
  demeritCount: number
}

function totalsOf(entries: GrowthPointEntry[]): MonthlyTotals {
  let meritScore = 0
  let demeritScore = 0
  let meritCount = 0
  let demeritCount = 0

  for (const entry of entries) {
    if (entry.type === 'merit') {
      meritScore += entry.amount
      meritCount += 1
    } else {
      demeritScore += entry.amount
      demeritCount += 1
    }
  }
  return { meritScore, demeritScore, netScore: meritScore - demeritScore, meritCount, demeritCount }
}

export type DailyPoint = { day: number; merit: number; demerit: number; net: number }

function dailySeries(entries: GrowthPointEntry[], ym: YearMonth): DailyPoint[] {
  const days = Array.from({ length: daysInMonth(ym) }, (_, i) => ({
    day: i + 1,
    merit: 0,
    demerit: 0,
    net: 0,
  }))

  for (const entry of entries) {
    const at = new Date(entry.created_at)
    const index = at.getDate() - 1
    const bucket = days[index]
    if (!bucket) continue
    if (entry.type === 'merit') bucket.merit += entry.amount
    else bucket.demerit += entry.amount
    bucket.net = bucket.merit - bucket.demerit
  }
  return days
}

/** 학생별 누적 점수 배열 — 정원 환경 계산에 그대로 넘긴다(기록 없는 학생은 0점). */
function scoresFor(entries: GrowthPointEntry[], studentIds: string[]): number[] {
  const summaries = summarizeByStudent(entries)
  return studentIds.map((id) => summaries.get(id)?.score ?? 0)
}

export type GardenProgress = {
  start: GardenEnvironment
  end: GardenEnvironment
  /** 이번 달 동안 오른 정원 단계 수 (내려갔으면 음수) */
  stageDelta: number
}

export type ClassMonthlyReport = {
  yearMonth: YearMonth
  totals: MonthlyTotals
  daily: DailyPoint[]
  meritReasons: ReasonTally[]
  demeritReasons: ReasonTally[]
  /** 이번 달에 기록이 하나라도 있는 학생 수 */
  activeStudentCount: number
  totalStudentCount: number
  garden: GardenProgress
  entryCount: number
}

/**
 * @param entriesUpToMonthEnd 해당 월 말 이전의 모든 기록(월초 정원 상태 계산에 필요).
 */
export function buildClassMonthlyReport(
  entriesUpToMonthEnd: GrowthPointEntry[],
  ym: YearMonth,
  studentIds: string[],
): ClassMonthlyReport {
  const { before, inMonth } = splitByMonth(entriesUpToMonthEnd, ym)
  const activeStudents = new Set(inMonth.map((entry) => entry.student_id))

  return {
    yearMonth: ym,
    totals: totalsOf(inMonth),
    daily: dailySeries(inMonth, ym),
    meritReasons: tallyReasons(inMonth.filter((entry) => entry.type === 'merit')),
    demeritReasons: tallyReasons(inMonth.filter((entry) => entry.type === 'demerit')),
    activeStudentCount: activeStudents.size,
    totalStudentCount: studentIds.length,
    garden: buildGardenProgress(before, [...before, ...inMonth], studentIds),
    entryCount: inMonth.length,
  }
}

function buildGardenProgress(
  beforeEntries: GrowthPointEntry[],
  throughEntries: GrowthPointEntry[],
  studentIds: string[],
): GardenProgress {
  const start = calculateGardenEnvironment(scoresFor(beforeEntries, studentIds))
  const end = calculateGardenEnvironment(scoresFor(throughEntries, studentIds))
  return { start, end, stageDelta: end.stage - start.stage }
}

export type StudentMonthlyReport = {
  yearMonth: YearMonth
  studentId: string
  totals: MonthlyTotals
  meritReasons: ReasonTally[]
  demeritReasons: ReasonTally[]
  /** 이번 달 기록, 최신순 */
  entries: GrowthPointEntry[]
  /** 월초/월말 누적 점수와 성장 단계 */
  scoreStart: number
  scoreEnd: number
  stageStart: GrowthStage
  stageEnd: GrowthStage
  summaryEnd: GardenSummary
}

export function buildStudentMonthlyReport(
  entriesUpToMonthEnd: GrowthPointEntry[],
  ym: YearMonth,
  studentId: string,
): StudentMonthlyReport {
  const mine = entriesUpToMonthEnd.filter((entry) => entry.student_id === studentId)
  const { before, inMonth } = splitByMonth(mine, ym)

  const scoreStart = summarizeByStudent(before).get(studentId)?.score ?? 0
  const endSummaries = summarizeByStudent([...before, ...inMonth])
  const summaryEnd = endSummaries.get(studentId) ?? {
    studentId,
    score: 0,
    stage: 0 as GrowthStage,
    meritTotal: 0,
    demeritTotal: 0,
    entryCount: 0,
    lastEntryAt: null,
  }

  return {
    yearMonth: ym,
    studentId,
    totals: totalsOf(inMonth),
    meritReasons: tallyReasons(inMonth.filter((entry) => entry.type === 'merit')),
    demeritReasons: tallyReasons(inMonth.filter((entry) => entry.type === 'demerit')),
    entries: [...inMonth].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    scoreStart,
    scoreEnd: summaryEnd.score,
    stageStart: stageForScore(scoreStart),
    stageEnd: summaryEnd.stage,
    summaryEnd,
  }
}

/* ─── 월간 성장순 ────────────────────────────────────────────────────
   학생 개인의 "이번 달 성장"은 누적 성장 포인트(식물 단계)와 다른 지표다.
   여기서는 선택한 달의 기록만으로 계산하며, 0 하한도 두지 않는다(그 달의 변화량). */

export type MonthlyGrowthRow = {
  studentId: string
  /** 이번 달 상점 합 - 벌점 합 */
  monthlyGrowth: number
  meritScore: number
  demeritScore: number
  meritCount: number
  demeritCount: number
  /** 서로 다른 긍정 사유의 종류 수 — 동점 처리의 마지막 기준 */
  reasonKinds: number
  /** 이번 달 자주 보인 긍정 행동(많은 순) */
  topMeritReasons: ReasonTally[]
  /** 성장순 정렬에서의 순위(1부터). 비교값이 모두 같으면 순위를 공유한다. */
  rank: number
  /** 같은 순위를 가진 학생이 또 있으면 true(공동 성장자) */
  tied: boolean
}

/**
 * 동점 비교 순서: 월간 성장 → 상점 총점 → 상점 횟수 → 긍정 사유 종류 수.
 * 넷이 모두 같으면 억지로 순위를 나누지 않고 같은 순위(공동)로 둔다.
 */
function compareGrowth(a: MonthlyGrowthRow, b: MonthlyGrowthRow): number {
  return (
    b.monthlyGrowth - a.monthlyGrowth ||
    b.meritScore - a.meritScore ||
    b.meritCount - a.meritCount ||
    b.reasonKinds - a.reasonKinds
  )
}

export function buildMonthlyGrowthRanking(
  entriesUpToMonthEnd: GrowthPointEntry[],
  ym: YearMonth,
  studentIds: string[],
): MonthlyGrowthRow[] {
  const { inMonth } = splitByMonth(entriesUpToMonthEnd, ym)
  const byStudent = new Map<string, GrowthPointEntry[]>()
  for (const entry of inMonth) {
    const bucket = byStudent.get(entry.student_id)
    if (bucket) bucket.push(entry)
    else byStudent.set(entry.student_id, [entry])
  }

  const rows: MonthlyGrowthRow[] = studentIds.map((studentId) => {
    const mine = byStudent.get(studentId) ?? []
    const totals = totalsOf(mine)
    const meritReasons = tallyReasons(mine.filter((entry) => entry.type === 'merit'))
    return {
      studentId,
      monthlyGrowth: totals.netScore,
      meritScore: totals.meritScore,
      demeritScore: totals.demeritScore,
      meritCount: totals.meritCount,
      demeritCount: totals.demeritCount,
      reasonKinds: meritReasons.length,
      topMeritReasons: meritReasons,
      rank: 0,
      tied: false,
    }
  })

  const sorted = [...rows].sort(compareGrowth)

  // 앞 학생과 비교값이 완전히 같으면 같은 순위를 물려주고 양쪽을 공동으로 표시한다.
  let currentRank = 0
  sorted.forEach((row, index) => {
    const previous = sorted[index - 1]
    if (previous && compareGrowth(previous, row) === 0) {
      row.rank = previous.rank
      row.tied = true
      previous.tied = true
    } else {
      currentRank = index + 1
      row.rank = currentRank
    }
  })

  return sorted
}
