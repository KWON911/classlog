import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Student } from '../types'

type NewStudent = Omit<Student, 'id' | 'teacher_id' | 'created_at'>
type StudentUpdate = Partial<NewStudent>

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('number', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setStudents(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const addStudent = useCallback(async (input: NewStudent) => {
    const { data: userData } = await supabase.auth.getUser()
    const teacherId = userData.user?.id
    if (!teacherId) {
      setError('로그인이 필요합니다.')
      return { error: '로그인이 필요합니다.' }
    }

    const { data, error } = await supabase
      .from('students')
      .insert({ ...input, teacher_id: teacherId })
      .select()
      .single()

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setStudents((prev) => [...prev, data].sort((a, b) => a.number - b.number))
    return { data }
  }, [])

  const updateStudent = useCallback(async (id: string, input: StudentUpdate) => {
    const { data, error } = await supabase
      .from('students')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setStudents((prev) =>
      prev.map((s) => (s.id === id ? data : s)).sort((a, b) => a.number - b.number),
    )
    return { data }
  }, [])

  const deleteStudent = useCallback(async (id: string) => {
    const { error } = await supabase.from('students').delete().eq('id', id)

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setStudents((prev) => prev.filter((s) => s.id !== id))
    return {}
  }, [])

  return { students, loading, error, addStudent, updateStudent, deleteStudent, refetch: fetchStudents }
}
