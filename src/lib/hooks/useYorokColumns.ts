import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { YorokColumn, YorokColumnType } from '../types'

export function useYorokColumns() {
  const [columns, setColumns] = useState<YorokColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchColumns = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from('yorok_columns').select('*').order('position', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setColumns(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchColumns()
  }, [fetchColumns])

  const addColumn = useCallback(
    async (label: string, type: YorokColumnType) => {
      const { data: userData } = await supabase.auth.getUser()
      const teacherId = userData.user?.id
      if (!teacherId) {
        setError('로그인이 필요합니다.')
        return { error: '로그인이 필요합니다.' }
      }

      const nextPosition = columns.length === 0 ? 0 : Math.max(...columns.map((c) => c.position)) + 1

      const { data, error } = await supabase
        .from('yorok_columns')
        .insert({ label, type, position: nextPosition, teacher_id: teacherId })
        .select()
        .single()

      if (error) {
        setError(error.message)
        return { error: error.message }
      }

      setColumns((prev) => [...prev, data].sort((a, b) => a.position - b.position))
      return { data }
    },
    [columns],
  )

  /**
   * 컬럼 삭제 시 각 학생 yorok_entries.values jsonb 안에 남는 값은 정리하지
   * 않는다 — UI는 항상 현재 존재하는 columns 목록 기준으로만 렌더링하므로
   * 삭제된 컬럼의 키는 아무도 읽지 않는 무해한 잔여물이다.
   */
  const deleteColumn = useCallback(async (id: string) => {
    const { error } = await supabase.from('yorok_columns').delete().eq('id', id)

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setColumns((prev) => prev.filter((c) => c.id !== id))
    return {}
  }, [])

  return { columns, loading, error, addColumn, deleteColumn, refetch: fetchColumns }
}
