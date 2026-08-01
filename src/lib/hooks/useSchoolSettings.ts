import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { SchoolSettings } from '../types'

export type SchoolSettingsInput = Omit<SchoolSettings, 'teacher_id' | 'updated_at'>

export function useSchoolSettings() {
  const [settings, setSettings] = useState<SchoolSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from('school_settings').select('*').maybeSingle()

    if (error) {
      setError(error.message)
    } else {
      setSettings(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const saveSettings = useCallback(async (input: SchoolSettingsInput) => {
    const { data: userData } = await supabase.auth.getUser()
    const teacherId = userData.user?.id
    if (!teacherId) {
      setError('로그인이 필요합니다.')
      return { error: '로그인이 필요합니다.' }
    }

    const { data, error } = await supabase
      .from('school_settings')
      .upsert({ ...input, teacher_id: teacherId }, { onConflict: 'teacher_id' })
      .select()
      .single()

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setSettings(data)
    return { data }
  }, [])

  return { settings, loading, error, saveSettings, refetch: fetchSettings }
}
