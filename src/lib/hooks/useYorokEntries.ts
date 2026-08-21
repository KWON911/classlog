import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { YorokEntry } from '../types'

export function useYorokEntries() {
  const [entries, setEntries] = useState<YorokEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from('yorok_entries').select('*')

    if (error) {
      setError(error.message)
    } else {
      setEntries(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  /**
   * 전체 행 upsert — `values`는 이 학생의 "병합된 전체" 값이어야 한다(부분 패치 아님).
   * 호출부(YorokTable)가 기존 저장값 + 이번 편집분을 미리 병합해서 넘긴다 —
   * useAttendance.upsertEntry가 항상 전체 row 모양을 요구하는 것과 동일한 관례.
   */
  const saveEntryValues = useCallback(async (studentId: string, values: Record<string, string | boolean>) => {
    const { data: userData } = await supabase.auth.getUser()
    const teacherId = userData.user?.id
    if (!teacherId) {
      setError('로그인이 필요합니다.')
      return { error: '로그인이 필요합니다.' }
    }

    const { data, error } = await supabase
      .from('yorok_entries')
      .upsert({ student_id: studentId, teacher_id: teacherId, values }, { onConflict: 'student_id' })
      .select()
      .single()

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setEntries((prev) => [...prev.filter((e) => e.student_id !== studentId), data])
    return { data }
  }, [])

  return { entries, loading, error, saveEntryValues, refetch: fetchEntries }
}
