import { describe, expect, it } from 'vitest'
import { emojiForMenuItem } from './mealEmoji'

describe('emojiForMenuItem', () => {
  it('matches rice items', () => {
    expect(emojiForMenuItem('잡곡밥')).toBe('🍚')
  })

  it('matches soup items', () => {
    expect(emojiForMenuItem('된장찌개')).toBe('🍲')
  })

  it('matches meat items', () => {
    expect(emojiForMenuItem('제육볶음')).toBe('🍖')
  })

  it('falls back to the default emoji when no keyword matches', () => {
    expect(emojiForMenuItem('완전히 알 수 없는 메뉴')).toBe('🍽️')
  })

  it('matches "국" as a substring inside a compound word without a standalone token', () => {
    // "미역국"은 띄어쓰기 없이 "국"을 포함하는 복합명사 — 한국어는 공백으로
    // 단어를 구분하지 않으므로 부분 문자열 매칭이 의도적으로 맞는 동작이다.
    expect(emojiForMenuItem('미역국')).toBe('🍲')
  })
})
