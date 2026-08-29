import { useCallback, useEffect, useMemo, useState } from 'react'
import { growthGardenService } from '../growth-garden/services'
import {
  buildClassMonthlyReport,
  buildMonthlyGrowthRanking,
  buildStudentMonthlyReport,
  monthRange,
  type ClassMonthlyReport,
  type MonthlyGrowthRow,
  type StudentMonthlyReport,
  type YearMonth,
} from '../growth-garden/monthlyReport'
import type { GrowthPointEntry } from '../types'
import { useGrowthSettings } from '../growth-garden/growthSettingsContext'

/**
 * 월별 리포트 데이터.
 *
 * 해당 월 말 이전의 기록만 가져온다 — 월초 정원/개인 상태를 계산하려면 그 이전
 * 기록이 필요하고, 그 이후 기록은 이 달 리포트와 무관하기 때문. 조회 범위를
 * 서비스에 넘기므로 전체 기록을 매번 끌어오지 않는다.
 * 집계는 전부 순수 모듈(monthlyReport.ts)이 하고, 여기서는 조회와 상태만 맡는다.
 */
export function useMonthlyReport(yearMonth: YearMonth, studentIds: string[]) {
  const { personalStages, environmentStages, loading: settingsLoading } = useGrowthSettings()
  const [entries, setEntries] = useState<GrowthPointEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { endIso } = monthRange(yearMonth)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await growthGardenService.listEntries({ to: endIso })
    if (error) setError(error)
    else setEntries(data ?? [])
    setLoading(false)
  }, [endIso])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // studentIds 배열은 매 렌더 새로 만들어져 들어오므로 내용으로 메모이즈한다.
  const studentKey = studentIds.join(',')

  const classReport: ClassMonthlyReport = useMemo(
    () =>
      buildClassMonthlyReport(entries, yearMonth, studentKey ? studentKey.split(',') : [], {
        personal: personalStages,
        garden: environmentStages,
      }),
    [entries, yearMonth.year, yearMonth.month, studentKey, personalStages, environmentStages], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const growthRanking: MonthlyGrowthRow[] = useMemo(
    () => buildMonthlyGrowthRanking(entries, yearMonth, studentKey ? studentKey.split(',') : []),
    [entries, yearMonth.year, yearMonth.month, studentKey], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const studentReportFor = useCallback(
    (studentId: string): StudentMonthlyReport =>
      buildStudentMonthlyReport(entries, yearMonth, studentId, {
        personal: personalStages,
        garden: environmentStages,
      }),
    [entries, yearMonth, personalStages, environmentStages],
  )

  return { loading: loading || settingsLoading, error, classReport, growthRanking, studentReportFor, refetch: fetchEntries }
}
