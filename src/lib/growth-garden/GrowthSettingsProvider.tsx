import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { growthSettingsService } from './services/growthSettingsService'
import {
  DEFAULT_GROWTH_SETTINGS,
  resolveEnvironmentStages,
  resolveGrowthStages,
  type GrowthSettings,
} from './growthSettings'
import { GrowthSettingsContext, type GrowthSettingsContextValue } from './growthSettingsContext'

/**
 * 성장 기준을 한 번만 불러와 앱 전체가 같은 기준을 쓰게 한다.
 *
 * 화면마다 따로 불러오면 카드·정원·리포트가 잠깐씩 다른 기준으로 그려질 수 있다.
 * 불러오는 동안에는 `loading`을 켜 두고, 그 사이에는 데이터 훅들이 로딩 상태를
 * 유지하므로 식물 단계가 기본값 → 사용자값으로 깜빡이지 않는다.
 */
export function GrowthSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GrowthSettings>(DEFAULT_GROWTH_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    const { data, error } = await growthSettingsService.load()
    // 설정을 못 불러와도 앱은 기본값으로 계속 돌아가야 한다(치명적 오류가 아니다).
    if (error) setError(error)
    else {
      setError(null)
      setSettings(data ?? DEFAULT_GROWTH_SETTINGS)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const save = useCallback(async (next: GrowthSettings) => {
    const { error } = await growthSettingsService.save(next)
    if (error) {
      setError(error)
      return { error }
    }
    setError(null)
    setSettings(next)
    return {}
  }, [])

  const value = useMemo<GrowthSettingsContextValue>(
    () => ({
      settings,
      personalStages: resolveGrowthStages(settings.personal),
      environmentStages: resolveEnvironmentStages(settings.garden),
      loading,
      error,
      save,
      refetch: fetchSettings,
    }),
    [settings, loading, error, save, fetchSettings],
  )

  return <GrowthSettingsContext.Provider value={value}>{children}</GrowthSettingsContext.Provider>
}
