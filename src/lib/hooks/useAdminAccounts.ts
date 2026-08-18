import { useCallback, useEffect, useState } from 'react'
import type { ManagedAccount } from '../admin'
import { supabase } from '../supabaseClient'

export function useAdminAccounts(enabled = true) {
  const [accounts, setAccounts] = useState<ManagedAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!enabled) {
      setAccounts([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.rpc('list_managed_accounts')
    if (error) setError(error.message)
    else setAccounts((data ?? []) as ManagedAccount[])
    setLoading(false)
  }, [enabled])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const resetAccount = useCallback(
    async (teacherId: string) => {
      const { error } = await supabase.rpc('reset_managed_account', { target_teacher_id: teacherId })
      if (error) {
        setError(error.message)
        return { error: error.message }
      }
      await refetch()
      return {}
    },
    [refetch],
  )

  return { accounts, loading, error, resetAccount, refetch }
}
