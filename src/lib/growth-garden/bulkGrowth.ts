/**
 * 선택 학생 일괄 상벌점의 순수 로직 — React/Supabase 의존 없음.
 *
 * 점수 계산은 여기 없다. 일괄이든 개별이든 점수는 `growth.ts`가 기록에서 파생하므로,
 * 이 모듈은 "한 번의 일괄 작업이 어떤 기록들을 만드는가"와 "만들어진 기록을 다시
 * 하나의 묶음으로 읽는 법"만 담당한다.
 */
import type { GrowthPointEntry, GrowthPointType } from '../types'
import type { NewGrowthPointEntry } from './services/types'

/** 확인 창·목록에서 이름을 몇 개까지 그대로 보여줄지 */
export const TARGET_NAME_PREVIEW_LIMIT = 3

export type BulkPointInput = {
  studentIds: string[]
  type: GrowthPointType
  /** 양수 크기 — 부호는 type이 정한다(개별 기록과 같은 규칙). */
  amount: number
  reason: string
}

/**
 * 일괄 작업 id. 날짜가 보이면 나중에 기록을 눈으로 훑을 때 쓸모가 있고,
 * 뒤의 임의 문자열이 같은 날 여러 작업을 구분한다.
 */
export function createBatchId(now: Date = new Date(), random: () => number = Math.random): string {
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  const suffix = Math.floor(random() * 36 ** 6)
    .toString(36)
    .padStart(6, '0')
  return `bulk_${year}${month}${day}_${suffix}`
}

/**
 * 선택한 학생 수만큼 **독립된** 기록을 만든다.
 * 한 행에 studentIds 배열을 넣지 않는 이유: 개인 기록·성장 단계·월별 리포트·성장순이
 * 모두 "학생 한 명의 기록 한 건"을 세는 구조라, 묶어서 저장하면 그 전부가 어긋난다.
 */
export function buildBulkEntries(input: BulkPointInput, batchId: string): NewGrowthPointEntry[] {
  const unique = [...new Set(input.studentIds)]
  return unique.map((studentId) => ({
    student_id: studentId,
    type: input.type,
    amount: Math.abs(input.amount),
    reason: input.reason,
    source: 'bulk' as const,
    batch_id: batchId,
  }))
}

/** 기존 기록(source가 없던 시절 포함)은 개별 기록으로 읽는다. */
export function isBulkEntry(entry: GrowthPointEntry): boolean {
  return entry.source === 'bulk' && Boolean(entry.batch_id)
}

export type BulkBatch = {
  batchId: string
  type: GrowthPointType
  amount: number
  reason: string
  /** 묶음 안에서 가장 이른 기록 시각 */
  createdAt: string
  studentIds: string[]
  entryIds: string[]
}

/**
 * 기록 목록 → 일괄 작업 묶음(최신순).
 *
 * 취소로 일부만 지워졌거나 점수·사유가 섞인 묶음이 들어와도 대표값(가장 이른 기록)을
 * 쓰고 버리지 않는다 — 화면에서 "이런 묶음이 있었다"는 사실 자체가 사라지면 안 된다.
 */
export function groupBulkBatches(entries: GrowthPointEntry[]): BulkBatch[] {
  const byBatch = new Map<string, GrowthPointEntry[]>()
  for (const entry of entries) {
    if (!isBulkEntry(entry)) continue
    const batchId = entry.batch_id as string
    const bucket = byBatch.get(batchId)
    if (bucket) bucket.push(entry)
    else byBatch.set(batchId, [entry])
  }

  const batches: BulkBatch[] = []
  for (const [batchId, group] of byBatch) {
    const sorted = [...group].sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0))
    const first = sorted[0]
    batches.push({
      batchId,
      type: first.type,
      amount: first.amount,
      reason: first.reason,
      createdAt: first.created_at,
      studentIds: sorted.map((entry) => entry.student_id),
      entryIds: sorted.map((entry) => entry.id),
    })
  }

  return batches.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
}

/**
 * '김하늘, 박서연, 이준호 외 22명' — 확인 창이 이름 목록으로 길어지지 않게 요약한다.
 * 이름이 limit 이하면 전부 보여준다.
 */
export function summarizeTargetNames(names: string[], limit: number = TARGET_NAME_PREVIEW_LIMIT): string {
  if (names.length === 0) return ''
  if (names.length <= limit) return names.join(', ')
  return `${names.slice(0, limit).join(', ')} 외 ${names.length - limit}명`
}

/** 전체 선택 여부 — 확인 창에서 '학급 전체'라고 말할 수 있는지 판단한다. */
export function isWholeClassSelection(selectedCount: number, classSize: number): boolean {
  return classSize > 0 && selectedCount === classSize
}

export type SelectionState = 'none' | 'partial' | 'all'

/** 전체 선택 체크박스의 3상태(☐ / ◩ / ☑). */
export function selectionState(selectedCount: number, classSize: number): SelectionState {
  if (classSize === 0 || selectedCount === 0) return 'none'
  return selectedCount >= classSize ? 'all' : 'partial'
}
