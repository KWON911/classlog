import { describe, expect, it } from 'vitest'
import {
  buildClassMonthlyReport,
  buildMonthlyGrowthRanking,
  buildStudentMonthlyReport,
  currentYearMonth,
  isFutureMonth,
  monthRange,
  shiftMonth,
  splitByMonth,
} from './monthlyReport'
import type { GrowthPointEntry, GrowthPointType } from '../types'

/** 로컬 시각으로 기록을 만든다 — 월 경계가 시차로 밀리지 않는지 함께 검증하기 위함. */
function entry(
  id: string,
  studentId: string,
  type: GrowthPointType,
  amount: number,
  local: [number, number, number, number?, number?],
  reason = type === 'merit' ? '친구를 도왔어요' : '준비물 미준비',
): GrowthPointEntry {
  const [y, m, d, h = 12, min = 0] = local
  return {
    id,
    student_id: studentId,
    teacher_id: 'teacher-1',
    type,
    amount,
    reason,
    created_at: new Date(y, m - 1, d, h, min).toISOString(),
  }
}

const AUG = { year: 2026, month: 8 }

describe('월 이동/범위', () => {
  it('이전·다음 달로 이동하며 연도가 넘어간다', () => {
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
  })

  it('월 범위는 해당 월 1일 00:00부터 다음 달 1일 00:00 직전까지다', () => {
    const { start, end } = monthRange(AUG)
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(7)
    expect(start.getDate()).toBe(1)
    expect(start.getHours()).toBe(0)
    expect(end.getMonth()).toBe(8)
    expect(end.getDate()).toBe(1)
  })

  it('미래 달을 구분한다', () => {
    const now = new Date(2026, 7, 15)
    expect(isFutureMonth({ year: 2026, month: 9 }, now)).toBe(true)
    expect(isFutureMonth({ year: 2026, month: 8 }, now)).toBe(false)
    expect(isFutureMonth({ year: 2026, month: 7 }, now)).toBe(false)
    expect(currentYearMonth(now)).toEqual({ year: 2026, month: 8 })
  })
})

describe('splitByMonth', () => {
  it('월 경계(말일 23:59와 다음 달 1일 00:00)를 정확히 가른다', () => {
    const entries = [
      entry('prev-last', 's1', 'merit', 1, [2026, 7, 31, 23, 59]),
      entry('first', 's1', 'merit', 1, [2026, 8, 1, 0, 0]),
      entry('last', 's1', 'merit', 1, [2026, 8, 31, 23, 59]),
      entry('next-first', 's1', 'merit', 1, [2026, 9, 1, 0, 0]),
    ]
    const { before, inMonth } = splitByMonth(entries, AUG)
    expect(before.map((e) => e.id)).toEqual(['prev-last'])
    expect(inMonth.map((e) => e.id)).toEqual(['first', 'last'])
  })
})

describe('buildClassMonthlyReport', () => {
  const students = ['s1', 's2', 's3']
  const entries = [
    // 지난달 기록 — 이번 달 집계에는 빠지고 월초 상태 계산에만 쓰인다.
    entry('p1', 's1', 'merit', 5, [2026, 7, 20]),
    // 이번 달
    entry('a', 's1', 'merit', 3, [2026, 8, 3], '친구를 도왔어요'),
    entry('b', 's1', 'merit', 2, [2026, 8, 3], '친구를 도왔어요'),
    entry('c', 's2', 'merit', 1, [2026, 8, 10], '발표를 잘했어요'),
    entry('d', 's2', 'demerit', 2, [2026, 8, 10], '준비물 미준비'),
    // 다음 달 기록은 들어오면 안 된다.
    entry('n1', 's3', 'merit', 9, [2026, 9, 2]),
  ]

  it('해당 월 상점·벌점·순 성장과 건수를 계산한다', () => {
    const report = buildClassMonthlyReport(entries, AUG, students)
    expect(report.totals.meritScore).toBe(6)
    expect(report.totals.demeritScore).toBe(2)
    expect(report.totals.netScore).toBe(4)
    expect(report.totals.meritCount).toBe(3)
    expect(report.totals.demeritCount).toBe(1)
    expect(report.entryCount).toBe(4)
  })

  it('기록이 있는 학생 수와 전체 학생 수를 구분한다', () => {
    const report = buildClassMonthlyReport(entries, AUG, students)
    expect(report.activeStudentCount).toBe(2)
    expect(report.totalStudentCount).toBe(3)
  })

  it('사유를 횟수 많은 순으로 모은다', () => {
    const report = buildClassMonthlyReport(entries, AUG, students)
    expect(report.meritReasons[0]).toEqual({ reason: '친구를 도왔어요', count: 2, score: 5 })
    expect(report.meritReasons[1]).toEqual({ reason: '발표를 잘했어요', count: 1, score: 1 })
    expect(report.demeritReasons).toEqual([{ reason: '준비물 미준비', count: 1, score: 2 }])
  })

  it('일별 추이를 해당 월 일수만큼 만들고 기록이 있는 날만 채운다', () => {
    const report = buildClassMonthlyReport(entries, AUG, students)
    expect(report.daily).toHaveLength(31)
    expect(report.daily[2]).toEqual({ day: 3, merit: 5, demerit: 0, net: 5 })
    expect(report.daily[9]).toEqual({ day: 10, merit: 1, demerit: 2, net: -1 })
    expect(report.daily[0]).toEqual({ day: 1, merit: 0, demerit: 0, net: 0 })
  })

  it('월초 정원 상태는 지난달까지의 기록만으로 계산한다', () => {
    const report = buildClassMonthlyReport(entries, AUG, students)
    expect(report.garden.start.totalScore).toBe(5)
    // s1은 5+3+2=10점, s2는 1-2=-1이지만 학생 점수는 0 미만이 되지 않으므로 0점.
    // 정원 상태는 학생별 점수를 합산하므로 단순 총점(9)이 아니라 10이 맞다.
    expect(report.garden.end.totalScore).toBe(10)
    expect(report.garden.stageDelta).toBe(report.garden.end.stage - report.garden.start.stage)
  })

  it('기록이 없는 달도 0으로 안전하게 처리한다', () => {
    const report = buildClassMonthlyReport(entries, { year: 2026, month: 6 }, students)
    expect(report.totals.netScore).toBe(0)
    expect(report.entryCount).toBe(0)
    expect(report.activeStudentCount).toBe(0)
    expect(report.meritReasons).toEqual([])
  })
})

describe('buildStudentMonthlyReport', () => {
  const entries = [
    entry('p1', 's1', 'merit', 4, [2026, 7, 15]),
    entry('a', 's1', 'merit', 3, [2026, 8, 5], '친구를 도왔어요'),
    entry('b', 's1', 'demerit', 1, [2026, 8, 20], '정리 미흡'),
    entry('other', 's2', 'merit', 7, [2026, 8, 6]),
  ]

  it('선택한 학생의 이번 달 기록만 집계한다', () => {
    const report = buildStudentMonthlyReport(entries, AUG, 's1')
    expect(report.totals.meritScore).toBe(3)
    expect(report.totals.demeritScore).toBe(1)
    expect(report.totals.netScore).toBe(2)
    expect(report.entries.map((e) => e.id)).toEqual(['b', 'a'])
  })

  it('월초와 월말의 누적 점수·성장 단계를 함께 준다', () => {
    const report = buildStudentMonthlyReport(entries, AUG, 's1')
    expect(report.scoreStart).toBe(4)
    expect(report.scoreEnd).toBe(6)
    expect(report.stageEnd).toBeGreaterThanOrEqual(report.stageStart)
  })

  it('기록이 없는 학생도 0으로 처리한다', () => {
    const report = buildStudentMonthlyReport(entries, AUG, 's-none')
    expect(report.totals.netScore).toBe(0)
    expect(report.scoreStart).toBe(0)
    expect(report.scoreEnd).toBe(0)
    expect(report.entries).toEqual([])
  })
})

describe('buildMonthlyGrowthRanking', () => {
  // 요구사항 예시: A(+18/-2=16), B(+16/-3=13), C(+16/-0=16) → A와 C가 동점.
  const entries = [
    entry('a1', 'A', 'merit', 18, [2026, 8, 5], '친구를 도왔어요'),
    entry('a2', 'A', 'demerit', 2, [2026, 8, 6]),
    entry('b1', 'B', 'merit', 16, [2026, 8, 5], '발표를 잘했어요'),
    entry('b2', 'B', 'demerit', 3, [2026, 8, 6]),
    entry('c1', 'C', 'merit', 16, [2026, 8, 5], '친구를 도왔어요'),
    // 지난달·다음달 기록은 이번 달 성장에 섞이면 안 된다.
    entry('past', 'B', 'merit', 99, [2026, 7, 5]),
    entry('future', 'B', 'merit', 99, [2026, 9, 5]),
  ]
  const students = ['A', 'B', 'C']

  it('월간 성장은 그 달 상점 - 벌점이다(누적 점수와 별개)', () => {
    const rows = buildMonthlyGrowthRanking(entries, AUG, students)
    const byId = Object.fromEntries(rows.map((row) => [row.studentId, row]))
    expect(byId.A.monthlyGrowth).toBe(16)
    expect(byId.B.monthlyGrowth).toBe(13)
    expect(byId.C.monthlyGrowth).toBe(16)
  })

  it('성장 높은 순으로 정렬한다', () => {
    const rows = buildMonthlyGrowthRanking(entries, AUG, students)
    expect(rows[rows.length - 1].studentId).toBe('B')
    expect(rows.slice(0, 2).map((row) => row.studentId).sort()).toEqual(['A', 'C'])
  })

  it('상점 총점이 같으면 상점 횟수로 가른다', () => {
    const tie = [
      entry('x1', 'X', 'merit', 5, [2026, 8, 2]),
      entry('y1', 'Y', 'merit', 3, [2026, 8, 2]),
      entry('y2', 'Y', 'merit', 2, [2026, 8, 3]),
    ]
    const rows = buildMonthlyGrowthRanking(tie, AUG, ['X', 'Y'])
    // 둘 다 +5지만 Y가 두 번에 걸쳐 받았으므로 Y가 앞선다.
    expect(rows[0].studentId).toBe('Y')
    expect(rows[0].tied).toBe(false)
  })

  it('모든 기준이 같으면 순위를 나누지 않고 공동으로 둔다', () => {
    const same = [
      entry('p1', 'P', 'merit', 4, [2026, 8, 2], '친구를 도왔어요'),
      entry('q1', 'Q', 'merit', 4, [2026, 8, 3], '친구를 도왔어요'),
    ]
    const rows = buildMonthlyGrowthRanking(same, AUG, ['P', 'Q'])
    expect(rows[0].rank).toBe(1)
    expect(rows[1].rank).toBe(1)
    expect(rows.every((row) => row.tied)).toBe(true)
  })

  it('기록이 없는 학생도 0점으로 포함한다', () => {
    const rows = buildMonthlyGrowthRanking(entries, AUG, [...students, 'Z'])
    const zero = rows.find((row) => row.studentId === 'Z')
    expect(zero?.monthlyGrowth).toBe(0)
    expect(zero?.topMeritReasons).toEqual([])
  })

  it('대표 긍정 행동을 많은 순으로 모은다', () => {
    const many = [
      entry('m1', 'A', 'merit', 1, [2026, 8, 2], '친구를 도왔어요'),
      entry('m2', 'A', 'merit', 1, [2026, 8, 3], '친구를 도왔어요'),
      entry('m3', 'A', 'merit', 1, [2026, 8, 4], '발표를 잘했어요'),
      entry('m4', 'A', 'demerit', 1, [2026, 8, 5], '준비물 미준비'),
    ]
    const [row] = buildMonthlyGrowthRanking(many, AUG, ['A'])
    expect(row.topMeritReasons.map((r) => r.reason)).toEqual(['친구를 도왔어요', '발표를 잘했어요'])
    expect(row.reasonKinds).toBe(2)
  })
})
