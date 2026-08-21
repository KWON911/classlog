import { useCallback, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { StudentRecord } from '../types'

const RECORDS_PAGE_SIZE = 1000

/** 로스터 페이지의 "생활기록 전체 내보내기" 버튼을 눌렀을 때만 호출되는
 *  지연(lazy) 조회 훅 — 이 프로젝트의 다른 테이블 훅들과 달리 마운트 시
 *  자동으로 fetch하지 않는다. 반 전체의 모든 생활기록을 로스터 페이지에
 *  들어갈 때마다 미리 불러올 이유가 없고, 내보내기를 누른 순간에만
 *  필요하기 때문이다. */
export function useAllRecords() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAllRecords = useCallback(async (): Promise<{ data?: StudentRecord[]; error?: string }> => {
    setLoading(true)
    setError(null)

    const allRecords: StudentRecord[] = []
    let from = 0

    while (true) {
      const { data, error } = await supabase
        .from('records')
        .select('*')
        .range(from, from + RECORDS_PAGE_SIZE - 1)

      if (error) {
        setLoading(false)
        setError(error.message)
        return { error: error.message }
      }

      allRecords.push(...(data ?? []))
      if (!data || data.length < RECORDS_PAGE_SIZE) break
      from += RECORDS_PAGE_SIZE
    }

    setLoading(false)
    return { data: allRecords }
  }, [])

  return { fetchAllRecords, loading, error }
}
