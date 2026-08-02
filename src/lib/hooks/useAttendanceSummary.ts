import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { AttendanceStatus } from '../types'

export type AttendanceSummary = Record<AttendanceStatus, number>

const EMPTY_SUMMARY: AttendanceSummary = { 결석: 0, 지각: 0, 조퇴: 0, 결과: 0 }

export function useAttendanceSummary(studentId: string) {
  const [summary, setSummary] = useState<AttendanceSummary>(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const fetchSummary = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', studentId)

    // Ignore a stale response from a student we've since navigated away from.
    if (requestIdRef.current !== requestId) return

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const counts: AttendanceSummary = { ...EMPTY_SUMMARY }
    for (const row of (data ?? []) as { status: AttendanceStatus }[]) {
      counts[row.status] += 1
    }
    setSummary(counts)
    setLoading(false)
  }, [studentId])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return { summary, loading, error, refetch: fetchSummary }
}
