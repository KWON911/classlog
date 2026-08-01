import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { SeatingPlan } from '../types'

export type SeatingPlanInput = Omit<SeatingPlan, 'id' | 'teacher_id' | 'created_at'>

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

/** `yearMonth` is `'YYYY-MM'` to scope to one month, or the literal `'all'` to fetch every saved plan for this teacher (no date filter). */
export function useSeatingPlans(yearMonth: string) {
  const [plans, setPlans] = useState<SeatingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    setError(null)
    let query = supabase.from('seating_plans').select('*')
    if (yearMonth !== 'all') {
      const { start, end } = monthRange(yearMonth)
      query = query.gte('plan_date', start).lt('plan_date', end)
    }
    const { data, error } = await query.order('plan_date', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setPlans(data ?? [])
    }
    setLoading(false)
  }, [yearMonth])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const savePlan = useCallback(async (id: string | null, input: SeatingPlanInput) => {
    const { data: userData } = await supabase.auth.getUser()
    const teacherId = userData.user?.id
    if (!teacherId) {
      setError('로그인이 필요합니다.')
      return { error: '로그인이 필요합니다.' }
    }

    if (id) {
      const { data, error } = await supabase
        .from('seating_plans')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        setError(error.message)
        return { error: error.message }
      }

      setPlans((prev) =>
        prev.map((p) => (p.id === id ? data : p)).sort((a, b) => b.plan_date.localeCompare(a.plan_date)),
      )
      return { data }
    }

    const { data, error } = await supabase
      .from('seating_plans')
      .insert({ ...input, teacher_id: teacherId })
      .select()
      .single()

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setPlans((prev) => [data, ...prev].sort((a, b) => b.plan_date.localeCompare(a.plan_date)))
    return { data }
  }, [])

  const deletePlan = useCallback(async (id: string) => {
    const { error } = await supabase.from('seating_plans').delete().eq('id', id)

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setPlans((prev) => prev.filter((p) => p.id !== id))
    return {}
  }, [])

  return { plans, loading, error, savePlan, deletePlan, refetch: fetchPlans }
}
