import { createContext, useContext } from 'react'
import {
  DEFAULT_GROWTH_SETTINGS,
  resolveEnvironmentStages,
  resolveGrowthStages,
  type GrowthSettings,
} from './growthSettings'
import type { GardenEnvironmentConfig, GrowthStageConfig } from './constants'

export type GrowthSettingsContextValue = {
  settings: GrowthSettings
  /** 기준 점수가 반영된 단계 표 — 모든 화면이 이걸 써야 기준이 갈리지 않는다. */
  personalStages: GrowthStageConfig[]
  environmentStages: GardenEnvironmentConfig[]
  /** 아직 불러오는 중이면 true. 이 동안 단계를 그리면 기본값으로 한 번 깜빡인다. */
  loading: boolean
  error: string | null
  save: (next: GrowthSettings) => Promise<{ error?: string }>
  refetch: () => Promise<void>
}

export const GrowthSettingsContext = createContext<GrowthSettingsContextValue | null>(null)

/**
 * 프로바이더 밖에서도 죽지 않고 기본 기준으로 동작한다 — 성장정원과 무관한 화면이
 * 실수로 이 훅을 쓰더라도 앱이 깨지지 않게.
 */
export function useGrowthSettings(): GrowthSettingsContextValue {
  const context = useContext(GrowthSettingsContext)
  if (context) return context

  return {
    settings: DEFAULT_GROWTH_SETTINGS,
    personalStages: resolveGrowthStages(),
    environmentStages: resolveEnvironmentStages(),
    loading: false,
    error: null,
    save: async () => ({}),
    refetch: async () => {},
  }
}
