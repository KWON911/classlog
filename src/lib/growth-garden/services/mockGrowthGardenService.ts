/**
 * mock 구현 — localStorage에 Supabase row와 "같은 모양"으로 저장한다.
 *
 * 같은 모양을 유지하는 게 핵심이다: 나중에 supabase 구현체로 바꿔도
 * 훅/화면/순수 로직은 한 줄도 건드릴 필요가 없다.
 */
import type { ClassGardenUnlock, ClassGoal, DecorationType, GrowthPointEntry, PlantCycle } from '../../types'
import { validateClassGoalMilestones } from '../classGoal'
import type {
  EntryRange,
  GrowthGardenService,
  NewClassGardenUnlock,
  NewClassGoal,
  NewGrowthPointEntry,
  NewPlantCycle,
} from './types'

const STORAGE_KEY = 'classlog:growth-garden:entries'
const CYCLES_STORAGE_KEY = 'classlog:growth-garden:plant-cycles'
const CLASS_GOALS_STORAGE_KEY = 'classlog:growth-garden:class-goals'
const CLASS_GARDEN_UNLOCKS_STORAGE_KEY = 'classlog:growth-garden:class-garden-unlocks'
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

function readCycles(): PlantCycle[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(CYCLES_STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed as PlantCycle[] : []
  } catch { return [] }
}

function writeCycles(cycles: PlantCycle[]) { window.localStorage.setItem(CYCLES_STORAGE_KEY, JSON.stringify(cycles)) }

const DECORATION_TYPES: ReadonlySet<DecorationType> = new Set([
  'stone_path', 'bench', 'pond', 'birdhouse', 'big_tree', 'bridge', 'fence', 'garden_lamp',
])

function isDecorationType(value: unknown): value is DecorationType {
  return typeof value === 'string' && DECORATION_TYPES.has(value as DecorationType)
}

function isClassGoal(value: unknown): value is ClassGoal {
  if (typeof value !== 'object' || value === null) return false
  const goal = value as Partial<ClassGoal>
  return (
    typeof goal.id === 'string' &&
    typeof goal.teacher_id === 'string' &&
    typeof goal.year === 'number' && Number.isInteger(goal.year) && goal.year >= 2000 && goal.year <= 2200 &&
    typeof goal.month === 'number' && Number.isInteger(goal.month) && goal.month >= 1 && goal.month <= 12 &&
    typeof goal.target_point === 'number' && Number.isInteger(goal.target_point) && goal.target_point > 0 &&
    Array.isArray(goal.milestones) &&
    goal.milestones.every((milestone) => (
      typeof milestone === 'object' && milestone !== null &&
      Number.isInteger(milestone.point) && milestone.point > 0 &&
      isDecorationType(milestone.decorationType)
    )) &&
    validateClassGoalMilestones(goal.milestones, goal.target_point) === null &&
    typeof goal.created_at === 'string' &&
    typeof goal.updated_at === 'string'
  )
}

function isClassGardenUnlock(value: unknown): value is ClassGardenUnlock {
  if (typeof value !== 'object' || value === null) return false
  const unlock = value as Partial<ClassGardenUnlock>
  return (
    typeof unlock.id === 'string' &&
    typeof unlock.teacher_id === 'string' &&
    isDecorationType(unlock.decoration_type) &&
    typeof unlock.year === 'number' && Number.isInteger(unlock.year) && unlock.year >= 2000 && unlock.year <= 2200 &&
    typeof unlock.month === 'number' && Number.isInteger(unlock.month) && unlock.month >= 1 && unlock.month <= 12 &&
    typeof unlock.milestone_point === 'number' && Number.isInteger(unlock.milestone_point) && unlock.milestone_point > 0 &&
    typeof unlock.unlocked_at === 'string' &&
    typeof unlock.created_at === 'string'
  )
}

function readStoredRows<T>(key: string, isRow: (value: unknown) => value is T): T[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isRow) : []
  } catch {
    return []
  }
}

function writeStoredRows<T>(key: string, rows: T[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(rows))
  } catch {
    // localStorage를 쓸 수 없는 환경에서도 mock 화면은 안전하게 동작한다.
  }
}

function readClassGoals(): ClassGoal[] {
  return readStoredRows(CLASS_GOALS_STORAGE_KEY, isClassGoal)
}

function readClassGardenUnlocks(): ClassGardenUnlock[] {
  return readStoredRows(CLASS_GARDEN_UNLOCKS_STORAGE_KEY, isClassGardenUnlock)
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

function toEntry(input: NewGrowthPointEntry): GrowthPointEntry {
  return {
    id: createId(),
    student_id: input.student_id,
    teacher_id: MOCK_TEACHER_ID,
    type: input.type,
    amount: Math.abs(input.amount),
    reason: input.reason,
    source: input.source ?? 'individual',
    batch_id: input.batch_id ?? null,
    created_at: new Date().toISOString(),
  }
}

export const mockGrowthGardenService: GrowthGardenService = {
  async listEntries(range?: EntryRange) {
    const all = readAll()
    const filtered = all.filter(
      (entry) =>
        (!range?.from || entry.created_at >= range.from) && (!range?.to || entry.created_at < range.to),
    )
    return delay({ data: filtered })
  },

  async listPlantCycles() { return delay({ data: readCycles() }) },

  async upsertPlantCycles(inputs: NewPlantCycle[]) {
    const current = readCycles()
    const added = inputs.filter((input) => !current.some((cycle) => cycle.student_id === input.student_id && cycle.cycle_number === input.cycle_number)).map((input) => ({
      ...input, id: createId(), teacher_id: MOCK_TEACHER_ID, created_at: new Date().toISOString(),
    }))
    writeCycles([...current, ...added])
    return delay({ data: added })
  },

  async getClassGoal(year: number, month: number) {
    return delay({ data: readClassGoals().find((goal) => goal.year === year && goal.month === month) ?? null })
  },

  async saveClassGoal(input: NewClassGoal) {
    const current = readClassGoals()
    const existing = current.find((goal) => goal.year === input.year && goal.month === input.month)
    const now = new Date().toISOString()
    const saved: ClassGoal = {
      ...input,
      id: existing?.id ?? createId(),
      teacher_id: MOCK_TEACHER_ID,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    }
    writeStoredRows(CLASS_GOALS_STORAGE_KEY, [
      ...current.filter((goal) => goal.year !== input.year || goal.month !== input.month),
      saved,
    ])
    return delay({ data: saved })
  },

  async listClassGardenUnlocks() {
    return delay({ data: readClassGardenUnlocks() })
  },

  async upsertClassGardenUnlocks(inputs: NewClassGardenUnlock[]) {
    const current = readClassGardenUnlocks()
    const requestedTypes = new Set<DecorationType>()
    const requestedMilestones = new Set<string>()
    const existingTypes = new Set(current.map((unlock) => unlock.decoration_type))
    const existingMilestones = new Set(current.map((unlock) => `${unlock.year}:${unlock.month}:${unlock.milestone_point}`))
    const now = new Date().toISOString()
    const added = inputs.flatMap((input) => {
      const milestoneKey = `${input.year}:${input.month}:${input.milestone_point}`
      if (
        requestedTypes.has(input.decoration_type) ||
        requestedMilestones.has(milestoneKey) ||
        existingTypes.has(input.decoration_type) ||
        existingMilestones.has(milestoneKey)
      ) return []

      requestedTypes.add(input.decoration_type)
      requestedMilestones.add(milestoneKey)
      existingTypes.add(input.decoration_type)
      existingMilestones.add(milestoneKey)
      return [{
        ...input,
        id: createId(),
        teacher_id: MOCK_TEACHER_ID,
        unlocked_at: now,
        created_at: now,
      }]
    })
    if (added.length > 0) writeStoredRows(CLASS_GARDEN_UNLOCKS_STORAGE_KEY, [...current, ...added])
    return delay({ data: added })
  },

  async addEntry(input: NewGrowthPointEntry) {
    const entry = toEntry(input)
    writeAll([...readAll(), entry])
    return delay({ data: entry })
  },

  /** 일괄 저장 — Supabase 구현과 마찬가지로 전부 저장되거나 전부 저장되지 않는다. */
  async addEntries(inputs: NewGrowthPointEntry[]) {
    if (inputs.length === 0) return delay({ data: [] })
    const created = inputs.map(toEntry)
    writeAll([...readAll(), ...created])
    return delay({ data: created })
  },

  async deleteEntry(id: string) {
    writeAll(readAll().filter((entry) => entry.id !== id))
    return delay({})
  },

  async deleteBatch(batchId: string) {
    writeAll(readAll().filter((entry) => entry.batch_id !== batchId))
    return delay({})
  },

  async clearStudent(studentId: string) {
    writeAll(readAll().filter((entry) => entry.student_id !== studentId))
    return delay({})
  },

  async clearClass() {
    writeAll([])
    return delay({})
  },
}
