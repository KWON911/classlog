/**
 * 월간 성장상 데이터 접근 — 상벌점/보상과 같은 방식(계약 하나 + mock/Supabase 두 구현).
 * 수상 기록은 성장 포인트와 완전히 분리돼 있어, 여기서 무엇을 해도 학생 점수는 변하지 않는다.
 */
import { supabase } from '../../supabaseClient'
import type { MonthlyAward } from '../../types'
import { GROWTH_GARDEN_DATA_SOURCE } from '../constants'
import type { MonthlyAwardService } from './types'

const TABLE = 'monthly_awards'
const STORAGE_KEY = 'classlog:growth-garden:monthly-awards'
const SIMULATED_LATENCY_MS = 80
const MOCK_TEACHER_ID = 'mock-teacher'

/** 테이블이 아직 없을 때(마이그레이션 전) 교사가 알아볼 수 있는 안내로 바꿔 준다. */
const MISSING_TABLE_HINT =
  '수상 테이블이 아직 없습니다. supabase/migrations/20260830_monthly_awards.sql을 Supabase에서 실행해 주세요.'

function toError(message: string): { error: string } {
  const missing = message.includes('monthly_awards') && /schema cache|does not exist/i.test(message)
  return { error: missing ? MISSING_TABLE_HINT : message }
}

function readAll(): MonthlyAward[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as MonthlyAward[]) : []
  } catch {
    return []
  }
}

function writeAll(awards: MonthlyAward[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(awards))
  } catch {
    // 저장 실패해도 화면 동작은 막지 않는다.
  }
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), SIMULATED_LATENCY_MS))
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `ma_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

const mockMonthlyAwardService: MonthlyAwardService = {
  async listAwards(year, month) {
    return delay({ data: readAll().filter((award) => award.year === year && award.month === month) })
  },

  async createAward(input) {
    const award: MonthlyAward = {
      id: createId(),
      teacher_id: MOCK_TEACHER_ID,
      student_id: input.student_id,
      year: input.year,
      month: input.month,
      monthly_growth: input.monthly_growth,
      title: input.title,
      reward_title: input.reward_title,
      reward_description: input.reward_description ?? null,
      awarded_on: input.awarded_on,
      created_at: new Date().toISOString(),
    }
    writeAll([...readAll(), award])
    return delay({ data: award })
  },

  async updateAward(id, input) {
    const all = readAll()
    const next = all.map((award) => (award.id === id ? { ...award, ...input } : award))
    writeAll(next)
    const updated = next.find((award) => award.id === id)
    return delay(updated ? { data: updated } : { error: '수상 기록을 찾지 못했습니다.' })
  },

  async deleteAward(id) {
    writeAll(readAll().filter((award) => award.id !== id))
    return delay({})
  },
}

const supabaseMonthlyAwardService: MonthlyAwardService = {
  async listAwards(year, month) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .order('created_at', { ascending: true })

    if (error) return toError(error.message)
    return { data: (data ?? []) as MonthlyAward[] }
  },

  async createAward(input) {
    const { data: userData } = await supabase.auth.getUser()
    const teacherId = userData.user?.id
    if (!teacherId) return { error: '로그인이 필요합니다.' }

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        teacher_id: teacherId,
        student_id: input.student_id,
        year: input.year,
        month: input.month,
        monthly_growth: input.monthly_growth,
        title: input.title,
        reward_title: input.reward_title,
        reward_description: input.reward_description ?? null,
        awarded_on: input.awarded_on,
      })
      .select()
      .single()

    if (error) return toError(error.message)
    return { data: data as MonthlyAward }
  },

  async updateAward(id, input) {
    const { data, error } = await supabase.from(TABLE).update(input).eq('id', id).select().single()
    if (error) return toError(error.message)
    return { data: data as MonthlyAward }
  },

  async deleteAward(id) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) return toError(error.message)
    return {}
  },
}

/** 상벌점·보상과 같은 스위치를 따른다. */
export const monthlyAwardService: MonthlyAwardService =
  GROWTH_GARDEN_DATA_SOURCE === 'supabase' ? supabaseMonthlyAwardService : mockMonthlyAwardService
