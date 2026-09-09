import { describe, expect, it } from 'vitest'
import { getRemainingDirtyIds } from './yorokAutosave'

describe('getRemainingDirtyIds', () => {
  it('removes a successfully saved student whose draft did not change during saving', () => {
    const savedValues = { c1: '저장할 내용' }
    const snapshot = new Map([['s1', savedValues]])
    const currentDraft = new Map([['s1', savedValues], ['s2', { c1: '다른 변경' }]])

    expect(getRemainingDirtyIds(new Set(['s1', 's2']), new Set(['s1']), snapshot, currentDraft)).toEqual(new Set(['s2']))
  })

  it('keeps a student dirty when the draft changed while that student was saving', () => {
    const snapshot = new Map([['s1', { c1: '저장 전' }]])
    const currentDraft = new Map([['s1', { c1: '저장 중 수정' }]])

    expect(getRemainingDirtyIds(new Set(['s1']), new Set(['s1']), snapshot, currentDraft)).toEqual(new Set(['s1']))
  })

  it('keeps a failed student dirty for retry', () => {
    const savedValues = { c1: '다시 시도' }
    const snapshot = new Map([['s1', savedValues]])
    const currentDraft = new Map([['s1', savedValues]])

    expect(getRemainingDirtyIds(new Set(['s1']), new Set(), snapshot, currentDraft)).toEqual(new Set(['s1']))
  })
})
