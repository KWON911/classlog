import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { AttendanceEntry, AttendanceReasonCategory, AttendanceStatus } from '../types'

type EntryInput = {
  status: AttendanceStatus
  reason_category: AttendanceReasonCategory
  note: string | null
}

function monthRange(yearMonth: string) {
  const [yearStr, monthStr] = yearMonth.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const start = `${yearMonth}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
  return { start, end }
}

export function useAttendance(yearMonth: string) {
  const [entries, setEntries] = useState<AttendanceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { start, end } = monthRange(yearMonth)
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .gte('date', start)
      .lt('date', end)

    if (error) {
      setError(error.message)
    } else {
      setEntries(data ?? [])
    }
    setLoading(false)
  }, [yearMonth])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const upsertEntry = useCallback(async (studentId: string, date: string, input: EntryInput) => {
    const { data: userData } = await supabase.auth.getUser()
    const teacherId = userData.user?.id
    if (!teacherId) {
      setError('로그인이 필요합니다.')
      return { error: '로그인이 필요합니다.' }
    }

    const { data, error } = await supabase
      .from('attendance')
      .upsert(
        { student_id: studentId, teacher_id: teacherId, date, ...input },
        { onConflict: 'student_id,date' },
      )
      .select()
      .single()

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setEntries((prev) => [
      ...prev.filter((e) => !(e.student_id === studentId && e.date === date)),
      data,
    ])
    return { data }
  }, [])

  const clearEntry = useCallback(async (studentId: string, date: string) => {
    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('student_id', studentId)
      .eq('date', date)

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setEntries((prev) => prev.filter((e) => !(e.student_id === studentId && e.date === date)))
    return {}
  }, [])

  /**
   * Deletes exactly one record by its primary key. RLS's `teacher_id =
   * auth.uid()` clause already scopes DELETE to rows the caller owns, so a
   * foreign or stale id simply matches zero rows rather than erroring —
   * `.select()` on the delete lets us tell that apart from a real failure.
   */
  const deleteEntry = useCallback(async (recordId: string) => {
    const { data, error } = await supabase.from('attendance').delete().eq('id', recordId).select()

    if (error) {
      setError(error.message)
      return { error: error.message }
    }
    if (!data || data.length === 0) {
      const message = '기록을 찾을 수 없거나 삭제 권한이 없습니다.'
      setError(message)
      return { error: message }
    }

    setEntries((prev) => prev.filter((e) => e.id !== recordId))
    return { data: data[0] }
  }, [])

  return { entries, loading, error, upsertEntry, clearEntry, deleteEntry, refetch: fetchEntries }
}
