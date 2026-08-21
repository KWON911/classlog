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

  const renameColumn = useCallback(async (id: string, label: string) => {
    const { data, error } = await supabase.from('yorok_columns').update({ label }).eq('id', id).select().single()

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setColumns((prev) => prev.map((c) => (c.id === id ? data : c)))
    return { data }
  }, [])

  /**
   * `orderedIds`는 새 순서대로 나열된 전체 컬럼 id 목록 — 각 컬럼을 배열 내
   * 인덱스를 새 position으로 개별 update한다. label/type처럼 NOT NULL인
   * 다른 필드까지 함께 보내야 하는 upsert 대신 position 하나만 patch하는
   * 이유: 값이 없는 컬럼까지 실어 보내면 그 컬럼들의 NOT NULL 제약을
   * 건드리게 되므로, 순수 update가 더 안전하다.
   */
  const reorderColumns = useCallback(async (orderedIds: string[]) => {
    const results = await Promise.all(
      orderedIds.map((id, index) =>
        supabase.from('yorok_columns').update({ position: index }).eq('id', id).select().single(),
      ),
    )

    const failed = results.find((r) => r.error)
    if (failed?.error) {
      setError(failed.error.message)
      return { error: failed.error.message }
    }

    const updatedById = new Map(results.map((r) => [r.data.id, r.data]))
    setColumns((prev) =>
      prev.map((c) => updatedById.get(c.id) ?? c).sort((a, b) => a.position - b.position),
    )
    return {}
  }, [])

  return { columns, loading, error, addColumn, deleteColumn, renameColumn, reorderColumns, refetch: fetchColumns }
}
