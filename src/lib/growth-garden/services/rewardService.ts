/**
 * 보상 데이터 접근 — 상벌점과 같은 방식(계약 하나 + mock/Supabase 두 구현)이지만
 * 저장소는 완전히 분리돼 있다. 보상을 지급해도 성장 포인트는 건드리지 않는다.
 */
import { supabase } from '../../supabaseClient'
import type { Reward } from '../../types'
import { GROWTH_GARDEN_DATA_SOURCE } from '../constants'
import type { RewardService } from './types'

const TABLE = 'rewards'
const STORAGE_KEY = 'classlog:growth-garden:rewards'
const SIMULATED_LATENCY_MS = 80
const MOCK_TEACHER_ID = 'mock-teacher'

/** 테이블이 아직 없을 때(마이그레이션 전) 교사가 알아볼 수 있는 안내로 바꿔 준다. */
const MISSING_TABLE_HINT =
  '보상 테이블이 아직 없습니다. supabase/migrations/20260830_rewards.sql을 Supabase에서 실행해 주세요.'

function isMissingTable(message: string): boolean {
  return message.includes('rewards') && /schema cache|does not exist/i.test(message)
}

function toError(message: string): { error: string } {
  return { error: isMissingTable(message) ? MISSING_TABLE_HINT : message }
}

function readAll(): Reward[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Reward[]) : []
  } catch {
    return []
  }
}

function writeAll(rewards: Reward[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rewards))
  } catch {
    // 저장 실패해도 화면 동작은 막지 않는다.
  }
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), SIMULATED_LATENCY_MS))
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `rw_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

const mockRewardService: RewardService = {
  async listRewards(year, month) {
    const rows = readAll().filter((reward) => reward.year === year && reward.month === month)
    return delay({ data: rows })
  },

  async createReward(input) {
    const reward: Reward = {
      id: createId(),
      teacher_id: MOCK_TEACHER_ID,
      scope: input.scope,
      student_id: input.scope === 'student' ? (input.student_id ?? null) : null,
      year: input.year,
      month: input.month,
      title: input.title,
      description: input.description ?? null,
      awarded_on: input.awarded_on,
      created_at: new Date().toISOString(),
    }
    writeAll([...readAll(), reward])
    return delay({ data: reward })
  },

  async deleteReward(id) {
    writeAll(readAll().filter((reward) => reward.id !== id))
    return delay({})
  },
}

const supabaseRewardService: RewardService = {
  async listRewards(year, month) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .order('awarded_on', { ascending: false })

    if (error) return toError(error.message)
    return { data: (data ?? []) as Reward[] }
  },

  async createReward(input) {
    const { data: userData } = await supabase.auth.getUser()
    const teacherId = userData.user?.id
    if (!teacherId) return { error: '로그인이 필요합니다.' }

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        teacher_id: teacherId,
        scope: input.scope,
        student_id: input.scope === 'student' ? (input.student_id ?? null) : null,
        year: input.year,
        month: input.month,
        title: input.title,
        description: input.description ?? null,
        awarded_on: input.awarded_on,
      })
      .select()
      .single()

    if (error) return toError(error.message)
    return { data: data as Reward }
  },

  async deleteReward(id) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) return toError(error.message)
    return {}
  },
}

/** 상벌점과 같은 스위치를 따른다 — 두 저장소가 따로 노는 일이 없도록. */
export const rewardService: RewardService =
  GROWTH_GARDEN_DATA_SOURCE === 'supabase' ? supabaseRewardService : mockRewardService

export type { NewReward } from './types'
