/**
 * 성장정원의 순수 도메인 로직 — React/Supabase 의존 없음.
 *
 * 점수 계산과 단계 판정을 여기 한 곳에 모아두면 서비스 구현(mock/Supabase)이
 * 바뀌어도 규칙은 그대로 남고, 단위 테스트도 목 없이 가능하다.
 * (`src/lib/seating.ts`, `src/lib/csv.ts`와 같은 결의 모듈)
 */
import type { GrowthPointEntry } from '../types'
import { GROWTH_STAGES, MAX_STAGE, MIN_SCORE, type GrowthStage, type GrowthStageConfig } from './constants'

/**
 * 단계 표는 인자로 받는다 — 교사가 설정에서 기준 점수를 바꿀 수 있기 때문(growthSettings.ts).
 * 넘기지 않으면 기본 표를 쓰므로 기존 호출부는 그대로 동작한다.
 */
export type StageTable = GrowthStageConfig[]

export type GardenSummary = {
  studentId: string
  /** 상점 합계 - 벌점 합계 (MIN_SCORE 이하로는 내려가지 않음) */
  score: number
  stage: GrowthStage
  meritTotal: number
  demeritTotal: number
  entryCount: number
  /** 가장 최근 기록의 created_at (ISO). 기록이 없으면 null. */
  lastEntryAt: string | null
}

export const EMPTY_SUMMARY: Omit<GardenSummary, 'studentId'> = {
  score: MIN_SCORE,
  stage: 0,
  meritTotal: 0,
  demeritTotal: 0,
  entryCount: 0,
  lastEntryAt: null,
}

/** 기록 한 건이 점수에 기여하는 부호 있는 값. 부호 규칙은 이 함수에만 존재한다. */
export function signedValue(entry: GrowthPointEntry): number {
  return entry.type === 'merit' ? entry.amount : -entry.amount
}

export function scoreFromEntries(entries: GrowthPointEntry[]): number {
  const raw = entries.reduce((sum, entry) => sum + signedValue(entry), 0)
  return Math.max(MIN_SCORE, raw)
}

/** 점수 → 단계. 단계 표가 minScore 오름차순이라는 전제 위에서 뒤에서부터 찾는다. */
export function stageForScore(score: number, stages: StageTable = GROWTH_STAGES): GrowthStage {
  for (let i = stages.length - 1; i >= 0; i -= 1) {
    if (score >= stages[i].minScore) return stages[i].stage
  }
  return 0
}

export function stageConfig(stage: GrowthStage, stages: StageTable = GROWTH_STAGES): GrowthStageConfig {
  return stages.find((config) => config.stage === stage) ?? stages[0]
}

export type StageProgress = {
  stage: GrowthStage
  current: GrowthStageConfig
  /** 최종 단계면 null */
  next: GrowthStageConfig | null
  /** 0~1. 최종 단계면 항상 1. */
  ratio: number
  /** 다음 단계까지 남은 점수. 최종 단계면 0. */
  remaining: number
}

export function stageProgress(score: number, stages: StageTable = GROWTH_STAGES): StageProgress {
  const stage = stageForScore(score, stages)
  const current = stageConfig(stage, stages)
  const next = stage === MAX_STAGE ? null : stageConfig((stage + 1) as GrowthStage, stages)

  if (!next) return { stage, current, next: null, ratio: 1, remaining: 0 }

  const span = next.minScore - current.minScore
  const gained = score - current.minScore
  // span은 설정상 항상 양수지만, 잘못된 설정으로 0이 되어도 NaN을 UI로 흘리지 않는다.
  const ratio = span > 0 ? Math.min(1, Math.max(0, gained / span)) : 1
  return { stage, current, next, ratio, remaining: Math.max(0, next.minScore - score) }
}

/** 최신순(created_at 내림차순) 정렬. 동률이면 id로 안정 정렬. */
export function sortEntriesByNewest(entries: GrowthPointEntry[]): GrowthPointEntry[] {
  return [...entries].sort((a, b) => {
    if (a.created_at === b.created_at) return b.id.localeCompare(a.id)
    return a.created_at < b.created_at ? 1 : -1
  })
}

export function entriesForStudent(entries: GrowthPointEntry[], studentId: string): GrowthPointEntry[] {
  return sortEntriesByNewest(entries.filter((entry) => entry.student_id === studentId))
}

export function summarizeStudent(
  entries: GrowthPointEntry[],
  studentId: string,
  stages: StageTable = GROWTH_STAGES,
): GardenSummary {
  const mine = entries.filter((entry) => entry.student_id === studentId)
  return buildSummary(studentId, mine, stages)
}

/** 학생 id → 요약. 기록이 하나도 없는 학생은 키 자체가 없으니 호출부는 EMPTY_SUMMARY로 폴백한다. */
export function summarizeByStudent(
  entries: GrowthPointEntry[],
  stages: StageTable = GROWTH_STAGES,
): Map<string, GardenSummary> {
  const grouped = new Map<string, GrowthPointEntry[]>()
  for (const entry of entries) {
    const bucket = grouped.get(entry.student_id)
    if (bucket) bucket.push(entry)
    else grouped.set(entry.student_id, [entry])
  }

  const summaries = new Map<string, GardenSummary>()
  for (const [studentId, studentEntries] of grouped) {
    summaries.set(studentId, buildSummary(studentId, studentEntries, stages))
  }
  return summaries
}

function buildSummary(
  studentId: string,
  studentEntries: GrowthPointEntry[],
  stages: StageTable = GROWTH_STAGES,
): GardenSummary {
  let meritTotal = 0
  let demeritTotal = 0
  let lastEntryAt: string | null = null

  for (const entry of studentEntries) {
    if (entry.type === 'merit') meritTotal += entry.amount
    else demeritTotal += entry.amount
    if (lastEntryAt === null || entry.created_at > lastEntryAt) lastEntryAt = entry.created_at
  }

  const score = Math.max(MIN_SCORE, meritTotal - demeritTotal)
  return {
    studentId,
    score,
    stage: stageForScore(score, stages),
    meritTotal,
    demeritTotal,
    entryCount: studentEntries.length,
    lastEntryAt,
  }
}
