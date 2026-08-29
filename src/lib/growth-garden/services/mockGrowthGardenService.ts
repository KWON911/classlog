/**
 * mock 구현 — localStorage에 Supabase row와 "같은 모양"으로 저장한다.
 *
 * 같은 모양을 유지하는 게 핵심이다: 나중에 supabase 구현체로 바꿔도
 * 훅/화면/순수 로직은 한 줄도 건드릴 필요가 없다.
 */
import type { GrowthPointEntry } from '../../types'
import type { GrowthGardenService, NewGrowthPointEntry } from './types'

const STORAGE_KEY = 'classlog:growth-garden:entries'
/** 실제 네트워크처럼 살짝 비동기 — 로딩 상태 처리가 mock에서도 검증되도록. */
const SIMULATED_LATENCY_MS = 80
const MOCK_TEACHER_ID = 'mock-teacher'

function readAll(): GrowthPointEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isGrowthPointEntry)
  } catch {
    return []
  }
}

function writeAll(entries: GrowthPointEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // 저장 실패(사파리 프라이빗 모드 등)해도 화면 동작은 막지 않는다.
  }
}

function isGrowthPointEntry(value: unknown): value is GrowthPointEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Partial<GrowthPointEntry>
  return (
    typeof entry.id === 'string' &&
    typeof entry.student_id === 'string' &&
    (entry.type === 'merit' || entry.type === 'demerit') &&
    typeof entry.amount === 'number' &&
    typeof entry.created_at === 'string'
  )
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), SIMULATED_LATENCY_MS))
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `gp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export const mockGrowthGardenService: GrowthGardenService = {
  async listEntries() {
    return delay({ data: readAll() })
  },

  async addEntry(input: NewGrowthPointEntry) {
    const entry: GrowthPointEntry = {
      id: createId(),
      student_id: input.student_id,
      teacher_id: MOCK_TEACHER_ID,
      type: input.type,
      amount: Math.abs(input.amount),
      reason: input.reason,
      created_at: new Date().toISOString(),
    }
    writeAll([...readAll(), entry])
    return delay({ data: entry })
  },

  async deleteEntry(id: string) {
    writeAll(readAll().filter((entry) => entry.id !== id))
    return delay({})
  },

  async clearStudent(studentId: string) {
    writeAll(readAll().filter((entry) => entry.student_id !== studentId))
    return delay({})
  },
}
