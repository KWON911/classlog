import { describe, expect, it } from 'vitest'
import {
  buildBulkEntries,
  createBatchId,
  groupBulkBatches,
  isBulkEntry,
  isWholeClassSelection,
  selectionState,
  summarizeTargetNames,
} from './bulkGrowth'
import { summarizeByStudent } from './growth'
import type { GrowthPointEntry } from '../types'

function entry(over: Partial<GrowthPointEntry>): GrowthPointEntry {
  return {
    id: 'e1',
    student_id: 's1',
    teacher_id: 't1',
    type: 'merit',
    amount: 1,
    reason: '발표를 잘했어요',
    source: 'individual',
    batch_id: null,
    created_at: '2026-08-30T01:00:00.000Z',
    ...over,
  }
}

describe('createBatchId', () => {
  it('bulk_날짜_임의문자 형태다', () => {
    const id = createBatchId(new Date(2026, 7, 5), () => 0.5)
    expect(id).toMatch(/^bulk_20260805_[0-9a-z]{6}$/)
  })

  it('같은 날이라도 작업마다 다르다', () => {
    const day = new Date(2026, 7, 5)
    let seed = 0
    const next = () => {
      seed += 0.137
      return seed % 1
    }
    expect(createBatchId(day, next)).not.toBe(createBatchId(day, next))
  })
})

describe('buildBulkEntries', () => {
  it('학생 수만큼 독립된 기록을 만들고 batchId를 공유한다', () => {
    const rows = buildBulkEntries({ studentIds: ['a', 'b', 'c'], type: 'merit', amount: 2, reason: '모둠 활동' }, 'bulk_1')

    expect(rows).toHaveLength(3)
    expect(rows.map((row) => row.student_id)).toEqual(['a', 'b', 'c'])
    expect(new Set(rows.map((row) => row.batch_id))).toEqual(new Set(['bulk_1']))
    expect(rows.every((row) => row.source === 'bulk')).toBe(true)
    expect(rows.every((row) => row.amount === 2 && row.type === 'merit')).toBe(true)
  })

  it('같은 학생이 두 번 들어와도 한 건만 만든다', () => {
    const rows = buildBulkEntries({ studentIds: ['a', 'a', 'b'], type: 'demerit', amount: 1, reason: '정리 미흡' }, 'b1')
    expect(rows.map((row) => row.student_id)).toEqual(['a', 'b'])
  })

  it('벌점도 양수 크기로 저장한다 — 부호는 type이 정한다', () => {
    const rows = buildBulkEntries({ studentIds: ['a'], type: 'demerit', amount: -3, reason: '수업 방해' }, 'b1')
    expect(rows[0]).toMatchObject({ type: 'demerit', amount: 3 })
  })
})

describe('일괄 기록도 개별 기록과 같은 규칙으로 집계된다', () => {
  it('개별 +3과 일괄 +2가 합쳐져 5점이 된다', () => {
    const entries = [
      entry({ id: '1', student_id: 's1', amount: 3 }),
      entry({ id: '2', student_id: 's1', amount: 2, source: 'bulk', batch_id: 'bulk_1' }),
    ]
    expect(summarizeByStudent(entries).get('s1')?.score).toBe(5)
  })

  it('일괄 벌점도 0점 아래로는 내려가지 않는다', () => {
    const entries = [entry({ id: '1', student_id: 's1', type: 'demerit', amount: 2, source: 'bulk', batch_id: 'b' })]
    expect(summarizeByStudent(entries).get('s1')?.score).toBe(0)
  })
})

describe('isBulkEntry', () => {
  it('source가 없던 예전 기록은 개별로 본다', () => {
    expect(isBulkEntry(entry({ source: null, batch_id: null }))).toBe(false)
    expect(isBulkEntry(entry({ source: undefined, batch_id: undefined }))).toBe(false)
    expect(isBulkEntry(entry({ source: 'bulk', batch_id: 'b1' }))).toBe(true)
  })
})

describe('groupBulkBatches', () => {
  it('개별 기록은 묶음에 들어가지 않는다', () => {
    expect(groupBulkBatches([entry({ id: '1' })])).toEqual([])
  })

  it('batchId별로 묶고 최신 묶음이 앞에 온다', () => {
    // 입력을 일부러 시간 역순이 아닌 순서로 둔다 — 정렬이 없으면 통과하지 못하도록.
    const entries = [
      entry({ id: 'a1', student_id: 'a', source: 'bulk', batch_id: 'old', created_at: '2026-08-01T00:00:00.000Z' }),
      entry({ id: 'n2', student_id: 'b', source: 'bulk', batch_id: 'new', created_at: '2026-08-20T00:00:01.000Z' }),
      entry({ id: 'a2', student_id: 'b', source: 'bulk', batch_id: 'old', created_at: '2026-08-01T00:00:01.000Z' }),
      entry({ id: 'n1', student_id: 'a', source: 'bulk', batch_id: 'new', created_at: '2026-08-20T00:00:00.000Z' }),
    ]

    const batches = groupBulkBatches(entries)
    expect(batches.map((batch) => batch.batchId)).toEqual(['new', 'old'])
    expect(batches[0].studentIds).toEqual(['a', 'b'])
    expect(batches[0].createdAt).toBe('2026-08-20T00:00:00.000Z')
    expect(batches[1].entryIds).toEqual(['a1', 'a2'])
  })
})

describe('summarizeTargetNames', () => {
  it('적으면 전부 보여준다', () => {
    expect(summarizeTargetNames(['김하늘', '박서연'])).toBe('김하늘, 박서연')
  })

  it('많으면 앞 세 명과 나머지 인원으로 줄인다', () => {
    const names = ['김하늘', '박서연', '이준호', '최민지', '정예린']
    expect(summarizeTargetNames(names)).toBe('김하늘, 박서연, 이준호 외 2명')
  })

  it('빈 목록은 빈 문자열', () => {
    expect(summarizeTargetNames([])).toBe('')
  })
})

describe('선택 상태', () => {
  it('전체 선택 여부를 판단한다', () => {
    expect(isWholeClassSelection(25, 25)).toBe(true)
    expect(isWholeClassSelection(24, 25)).toBe(false)
    // 학생이 0명이면 '전체 선택'이라는 말 자체가 성립하지 않는다.
    expect(isWholeClassSelection(0, 0)).toBe(false)
  })

  it('세 가지 체크 상태를 구분한다', () => {
    expect(selectionState(0, 25)).toBe('none')
    expect(selectionState(6, 25)).toBe('partial')
    expect(selectionState(25, 25)).toBe('all')
    expect(selectionState(0, 0)).toBe('none')
  })
})
