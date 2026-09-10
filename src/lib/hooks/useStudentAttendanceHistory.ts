import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { AttendanceEntry, AttendanceStatus } from '../types'

export function useStudentAttendanceHistory(studentId: string | undefined, status: AttendanceStatus | undefined) {
  const [entries, setEntries] = useState<AttendanceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    if (!studentId || !status) {
      setEntries([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', status)
      .order('date', { ascending: false })

    if (error) setError(error.message)
    else setEntries((data ?? []) as AttendanceEntry[])
    setLoading(false)
  }, [studentId, status])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  return { entries, loading, error, refetch: fetchHistory }
}
