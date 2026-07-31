import { useCallback, useEffect, useState } from 'react'
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

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .eq('student_id', studentId)
      .order('record_date', { ascending: false })

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
        [...prev, data].sort((a, b) => (a.record_date < b.record_date ? 1 : -1)),
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
        .sort((a, b) => (a.record_date < b.record_date ? 1 : -1)),
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
