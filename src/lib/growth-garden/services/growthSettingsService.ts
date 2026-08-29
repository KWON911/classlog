/**
 * 성장 기준 설정 저장소 — 다른 성장정원 데이터와 같은 방식(계약 + mock/Supabase 두 구현).
 *
 * 저장 단위는 교사 한 명(= 이 앱에서는 한 학급)이다. 기본값은 코드에만 있고 DB에는
 * "교사가 바꾼 값"만 들어간다 — 행이 없으면 앱이 기본값을 쓴다.
 */
import { supabase } from '../../supabaseClient'
import { GROWTH_GARDEN_DATA_SOURCE } from '../constants'
import { resolveSettings, type GrowthSettings } from '../growthSettings'

const TABLE = 'growth_settings'
const STORAGE_KEY = 'classlog:growth-garden:settings'
const SIMULATED_LATENCY_MS = 60

const MISSING_TABLE_HINT =
  '성장 기준 테이블이 아직 없습니다. supabase/migrations/20260830_growth_settings.sql을 Supabase에서 실행해 주세요.'

function toError(message: string): { error: string } {
  const missing = message.includes('growth_settings') && /schema cache|does not exist/i.test(message)
  return { error: missing ? MISSING_TABLE_HINT : message }
}

export type GrowthSettingsService = {
  /** 저장된 값이 없으면 null — 호출부가 기본값을 쓴다. */
  load(): Promise<{ data?: GrowthSettings | null; error?: string }>
  save(settings: GrowthSettings): Promise<{ data?: GrowthSettings; error?: string }>
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), SIMULATED_LATENCY_MS))
}

const mockGrowthSettingsService: GrowthSettingsService = {
  async load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return delay({ data: null })
      return delay({ data: resolveSettings(JSON.parse(raw) as Partial<GrowthSettings>) })
    } catch {
      return delay({ data: null })
    }
  },

  async save(settings) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // 저장 실패해도 화면 동작은 막지 않는다.
    }
    return delay({ data: settings })
  },
}

const supabaseGrowthSettingsService: GrowthSettingsService = {
  async load() {
    // 설정이 없는 교사가 대부분이므로 single()이 아니라 maybeSingle()을 쓴다.
    const { data, error } = await supabase
      .from(TABLE)
      .select('personal_thresholds, garden_thresholds')
      .maybeSingle()

    if (error) return toError(error.message)
    if (!data) return { data: null }
    return {
      data: resolveSettings({
        personal: data.personal_thresholds as number[],
        garden: data.garden_thresholds as number[],
      }),
    }
  },

  async save(settings) {
    const { data: userData } = await supabase.auth.getUser()
    const teacherId = userData.user?.id
    if (!teacherId) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.from(TABLE).upsert(
      {
        teacher_id: teacherId,
        personal_thresholds: settings.personal,
        garden_thresholds: settings.garden,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'teacher_id' },
    )

    if (error) return toError(error.message)
    return { data: settings }
  },
}

export const growthSettingsService: GrowthSettingsService =
  GROWTH_GARDEN_DATA_SOURCE === 'supabase' ? supabaseGrowthSettingsService : mockGrowthSettingsService
