import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { AttendanceEntry, AttendanceReasonCategory, AttendanceStatus } from '../types'
import { weekdayDatesInRange } from '../utils/attendanceDateRange'

export type AttendanceInput = {
  status: AttendanceStatus
  reason_category: AttendanceReasonCategory
  note: string | null
}
type EntryInput = AttendanceInput
export type AttendanceSaveResult = { error?: string; conflicts?: string[] }

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

  const addConsecutiveAbsences = useCallback(async (
    studentId: string,
    dates: string[],
    input: Pick<EntryInput, 'reason_category' | 'note'>,
  ) => {
    if (dates.length < 2 || new Set(dates).size !== dates.length) {
      return { error: '서로 다른 수업일을 2일 이상 선택해 주세요.' }
    }
    const { data: userData } = await supabase.auth.getUser()
    const teacherId = userData.user?.id
    if (!teacherId) return { error: '로그인이 필요합니다.' }

    // One INSERT keeps the operation atomic. The student/date unique constraint
    // rejects the whole request if any date already has an attendance record.
    const rows = dates.map((date) => ({
      student_id: studentId,
      teacher_id: teacherId,
      date,
      status: '결석' as const,
      ...input,
    }))
    const { data, error } = await supabase.from('attendance').insert(rows).select()
    if (error) {
      const message = error.code === '23505'
        ? '선택한 날짜 중 이미 출결 기록이 있습니다. 기존 기록을 확인한 뒤 다시 선택해 주세요.'
        : error.message
      return { error: message }
    }
    setEntries((prev) => [...prev, ...(data ?? []).filter((entry) => entry.date.startsWith(yearMonth))])
    return { data: data ?? [] }
  }, [yearMonth])

  const saveAttendanceRange = useCallback(async (
    studentId: string,
    dates: string[],
    input: AttendanceInput,
    overwrite = false,
  ): Promise<AttendanceSaveResult> => {
    const sorted = [...dates].sort()
    if (!studentId || !sorted.length || sorted.length > 31 || new Set(sorted).size !== sorted.length ||
      weekdayDatesInRange(sorted[0], sorted[sorted.length - 1]).length === 0 ||
      sorted.some((date) => weekdayDatesInRange(date, date).length !== 1)) {
      return { error: '유효한 수업일을 1일 이상 선택해 주세요. 기간은 최대 31일입니다.' }
    }
    try {
      const { data: userData } = await supabase.auth.getUser()
      const teacherId = userData.user?.id
      if (!teacherId) return { error: '로그인이 필요합니다.' }

      // Check the entire range, including dates outside the displayed month.
      const { data: existing, error: readError } = await supabase.from('attendance').select('*')
        .eq('student_id', studentId).gte('date', sorted[0]).lte('date', sorted[sorted.length - 1])
      if (readError) return { error: readError.message }
      const existingByDate = new Map<string, AttendanceEntry>((existing ?? []).map((entry) => [entry.date, entry]))
      const conflicts = sorted.filter((date) => existingByDate.has(date))
      if (conflicts.length && !overwrite) return { conflicts }

      const rows = sorted.map((date) => ({
        student_id: studentId, teacher_id: teacherId, date, ...input,
        neis_entered: existingByDate.get(date)?.neis_entered ?? false,
        document_received: existingByDate.get(date)?.document_received ?? false,
      }))
      // A single statement avoids partial saves; INSERT protects new records
      // against conflicts appearing after the preflight check.
      const query = overwrite
        ? supabase.from('attendance').upsert(rows, { onConflict: 'student_id,date' })
        : supabase.from('attendance').insert(rows)
      const { data, error: writeError } = await query.select()
      if (writeError) return { error: writeError.code === '23505' ? '출결 기록이 변경되었습니다. 다시 저장하여 기존 기록을 확인해 주세요.' : writeError.message }
      setEntries((prev) => [
        ...prev.filter((entry) => !(entry.student_id === studentId && sorted.includes(entry.date))),
        ...(data ?? []).filter((entry) => entry.date.startsWith(yearMonth)),
      ])
      return {}
    } catch {
      return { error: '출결을 저장하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.' }
    }
  }, [yearMonth])

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

  /**
   * Partial update of the NEIS/증빙서류 flags on one record, identified by
   * its primary key. Same RLS-aware "zero rows affected → error" handling
   * as deleteEntry, since a plain .update() is silently scoped by the
   * "teachers manage own attendance" policy's teacher_id = auth.uid()
   * clause — a foreign or stale id matches zero rows rather than erroring.
   */
  const updateEntryFlags = useCallback(
    async (recordId: string, patch: Partial<{ neis_entered: boolean; document_received: boolean }>) => {
      const { data, error } = await supabase.from('attendance').update(patch).eq('id', recordId).select()

      if (error) {
        setError(error.message)
        return { error: error.message }
      }
      if (!data || data.length === 0) {
        const message = '기록을 찾을 수 없거나 수정 권한이 없습니다.'
        setError(message)
        return { error: message }
      }

      const updated = data[0]
      setEntries((prev) => prev.map((e) => (e.id === recordId ? updated : e)))
      return { data: updated }
    },
    [],
  )

  return { entries, loading, error, upsertEntry, addConsecutiveAbsences, saveAttendanceRange, clearEntry, deleteEntry, updateEntryFlags, refetch: fetchEntries }
}
