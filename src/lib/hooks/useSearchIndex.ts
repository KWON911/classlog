import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { SearchAttendanceEntry, SearchRecord } from '../types'

export function useSearchIndex() {
  const [records, setRecords] = useState<SearchRecord[]>([])
  const [attendance, setAttendance] = useState<SearchAttendanceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchIndex = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [recordsResult, attendanceResult] = await Promise.all([
      supabase.from('records').select('id, student_id, category, content, record_date'),
      supabase.from('attendance').select('id, student_id, status, reason_category, note, date'),
    ])

    const errors: string[] = []

    if (recordsResult.error) {
      errors.push(recordsResult.error.message)
    } else {
      setRecords(recordsResult.data ?? [])
    }

    if (attendanceResult.error) {
      errors.push(attendanceResult.error.message)
    } else {
      setAttendance(attendanceResult.data ?? [])
    }

    setError(errors.length > 0 ? errors.join(' / ') : null)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchIndex()
  }, [fetchIndex])

  return { records, attendance, loading, error }
}
