/** 데이터 소스 선택 지점 — 여기 외에는 어떤 화면도 구현체를 직접 import하지 않는다. */
import { GROWTH_GARDEN_DATA_SOURCE } from '../constants'
import { mockGrowthGardenService } from './mockGrowthGardenService'
import { supabaseGrowthGardenService } from './supabaseGrowthGardenService'
import type { GrowthGardenService } from './types'

export const growthGardenService: GrowthGardenService =
  GROWTH_GARDEN_DATA_SOURCE === 'supabase' ? supabaseGrowthGardenService : mockGrowthGardenService

export type { GrowthGardenService, NewGrowthPointEntry } from './types'
