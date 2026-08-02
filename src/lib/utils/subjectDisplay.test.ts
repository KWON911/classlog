import { describe, expect, it } from 'vitest'
import { classifySubjectDisplay } from './subjectDisplay'

describe('classifySubjectDisplay', () => {
  it('keeps a 2-character subject on one line (tier 1)', () => {
    expect(classifySubjectDisplay('국어')).toEqual({ tier: 1, lines: ['국어'], fontSizeClass: 'text-[13px]' })
  })

  it('keeps a 4-character subject on one line (tier 1)', () => {
    expect(classifySubjectDisplay('진로활동').tier).toBe(1)
    expect(classifySubjectDisplay('진로활동').lines).toEqual(['진로활동'])
  })

  it('keeps a 5-character subject on one line (tier 1) — the reported bug', () => {
    const result = classifySubjectDisplay('동아리활동')
    expect(result.tier).toBe(1)
    expect(result.lines).toEqual(['동아리활동'])
  })

  it('splits a 7-character subject at a delimiter closest to the middle (tier 2)', () => {
    // "자율" + "·" + "자치활동" — must break right after the "·", not mid-word.
    const result = classifySubjectDisplay('자율·자치활동')
    expect(result.tier).toBe(2)
    expect(result.lines).toEqual(['자율·', '자치활동'])
  })

  it('splits a 7-character subject with no delimiter roughly in half (tier 2)', () => {
    const result = classifySubjectDisplay('창의적체험활동')
    expect(result.tier).toBe(2)
    expect(result.lines).toEqual(['창의적', '체험활동'])
  })

  it('does not count spaces toward the display length', () => {
    // "음악 감상" is 4 display characters (공백 제외) despite being 5 long.
    const result = classifySubjectDisplay('음악 감상')
    expect(result.tier).toBe(1)
    expect(result.lines).toEqual(['음악 감상'])
  })

  it('splits a subject with a space closest to the middle at that space (tier 2)', () => {
    // "체육" + " " + "이론수업" = 6 display characters, delimiter is the space.
    const result = classifySubjectDisplay('체육 이론수업')
    expect(result.tier).toBe(2)
    expect(result.lines).toEqual(['체육 ', '이론수업'])
  })

  it('classifies an 8+ character subject as tier 3 with a smaller font', () => {
    const result = classifySubjectDisplay('정보통신기술활동')
    expect(result.tier).toBe(3)
    expect(result.lines).toEqual(['정보통신', '기술활동'])
    expect(result.fontSizeClass).toBe('text-[13px]')
  })

  it('never drops or alters characters across the split', () => {
    const subjects = ['자율·자치활동', '창의적체험활동', '정보통신기술활동윤리']
    for (const subject of subjects) {
      const { lines } = classifySubjectDisplay(subject)
      expect(lines.join('')).toBe(subject)
    }
  })
})
