import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const RECORD_COUNTS_PAGE_SIZE = 1000

/** 학급기록의 "누가기록" 학생 카드에 학생별 생활기록 건수 배지를 표시하기
 *  위한 집계 훅. records 테이블의 모든 컬럼이 아니라 student_id 하나만
 *  조회해 가볍게 유지하고, 클라이언트에서 학생별로 개수를 센다.
 *  useAllRecords(내보내기 버튼 전용, 지연 조회, 전체 컬럼)와 달리 이 훅은
 *  카드가 항상 배지를 보여줘야 하므로 마운트 시 자동으로 조회한다.
 *  records 테이블이 Supabase 기본 조회 제한(1000행)을 넘을 수 있으므로
 *  useAllRecords와 동일한 방식으로 페이지네이션한다. */
export function useRecordCounts() {
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCounts = useCallback(async () => {
    setLoading(true)
    setError(null)

    const tally = new Map<string, number>()
    let from = 0

    while (true) {
      const { data, error } = await supabase
        .from('records')
        .select('student_id')
        .range(from, from + RECORD_COUNTS_PAGE_SIZE - 1)

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const rows = (data ?? []) as { student_id: string }[]
      for (const row of rows) {
        tally.set(row.student_id, (tally.get(row.student_id) ?? 0) + 1)
      }

      if (rows.length < RECORD_COUNTS_PAGE_SIZE) break
      from += RECORD_COUNTS_PAGE_SIZE
    }

    setCounts(tally)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  return { counts, loading, error, refetch: fetchCounts }
}
