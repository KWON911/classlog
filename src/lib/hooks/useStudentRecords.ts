import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { RecordCategory, StudentRecord } from '../types'

type NewRecord = {
  category: RecordCategory
  content: string
  record_date: string
}
type RecordUpdate = Partial<NewRecord>

export function useStudentRecords(studentId: string) {
  const [records, setRecords] = useState<StudentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const fetchRecords = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .eq('student_id', studentId)
      .order('record_date', { ascending: false })

    // A newer request (e.g. the user switched students again) may have
    // started and finished while this one was in flight — ignore this
    // stale response instead of overwriting the current student's data.
    if (requestIdRef.current !== requestId) return

    if (error) {
      setError(error.message)
    } else {
      setRecords(data ?? [])
    }
    setLoading(false)
  }, [studentId])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const addRecord = useCallback(
    async (input: NewRecord) => {
      const { data: userData } = await supabase.auth.getUser()
      const teacherId = userData.user?.id
      if (!teacherId) {
        setError('로그인이 필요합니다.')
        return { error: '로그인이 필요합니다.' }
      }

      const { data, error } = await supabase
        .from('records')
        .insert({ ...input, student_id: studentId, teacher_id: teacherId })
        .select()
        .single()

      if (error) {
        setError(error.message)
        return { error: error.message }
      }

      setRecords((prev) =>
        [...prev, data].sort(
          (a, b) =>
            b.record_date.localeCompare(a.record_date) || b.created_at.localeCompare(a.created_at),
        ),
      )
      return { data }
    },
    [studentId],
  )

  const updateRecord = useCallback(async (id: string, input: RecordUpdate) => {
    const { data, error } = await supabase
      .from('records')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setRecords((prev) =>
      prev
        .map((r) => (r.id === id ? data : r))
        .sort(
          (a, b) =>
            b.record_date.localeCompare(a.record_date) || b.created_at.localeCompare(a.created_at),
        ),
    )
    return { data }
  }, [])

  const deleteRecord = useCallback(async (id: string) => {
    const { error } = await supabase.from('records').delete().eq('id', id)

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setRecords((prev) => prev.filter((r) => r.id !== id))
    return {}
  }, [])

  return { records, loading, error, addRecord, updateRecord, deleteRecord, refetch: fetchRecords }
}
