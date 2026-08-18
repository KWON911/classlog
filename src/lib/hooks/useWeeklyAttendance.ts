import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { yyyymmddDash } from '../utils/date-utils'
import type { AttendanceEntryWithStudent } from '../types'

export function useWeeklyAttendance(weekStart: Date, weekEnd: Date, refreshToken: number) {
  const [data, setData] = useState<AttendanceEntryWithStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('attendance')
      .select('*, students(number, name)')
      .gte('date', yyyymmddDash(weekStart))
      .lte('date', yyyymmddDash(weekEnd))

    if (error) {
      setError(error.message)
    } else {
      setData((data ?? []) as AttendanceEntryWithStudent[])
    }
    setLoading(false)
  }, [weekStart, weekEnd])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries, refreshToken])

  return { data, loading, error, refetch: fetchEntries }
}
