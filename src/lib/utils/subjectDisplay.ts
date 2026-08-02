/**
 * Decides how a NEIS subject name should wrap inside a fixed-width
 * timetable cell — never truncates or renames the subject, only chooses
 * how many lines to render it on and where to break.
 */

export type SubjectDisplayTier = 1 | 2 | 3

export type SubjectDisplay = {
  tier: SubjectDisplayTier
  /** One line for tier 1, up to two for tier 2/3. Always joins back to the original subject. */
  lines: [string] | [string, string]
  fontSizeClass: string
}

const BREAK_CHARS = new Set([' ', '·', '/', '-'])

function splitAtBestBreak(subject: string): [string, string] {
  let bestIndex = -1
  let bestDistance = Infinity
  const mid = subject.length / 2

  for (let i = 0; i < subject.length; i++) {
    if (BREAK_CHARS.has(subject[i])) {
      const distance = Math.abs(i - mid)
      if (distance < bestDistance) {
        bestDistance = distance
        bestIndex = i
      }
    }
  }

  if (bestIndex === -1) {
    // No preferred break character — split as evenly as possible so
    // neither line strands a single trailing character.
    const cut = Math.floor(subject.length / 2)
    return [subject.slice(0, cut), subject.slice(cut)]
  }

  // Keep the delimiter with the first line ("자율·" / "자치활동").
  const cutAfter = bestIndex + 1
  return [subject.slice(0, cutAfter), subject.slice(cutAfter)]
}

export function classifySubjectDisplay(subject: string): SubjectDisplay {
  const displayLength = subject.replace(/\s+/g, '').length

  if (displayLength <= 5) {
    // Measured against the real rendered column width (see WeeklyTimetableCard):
    // a wide 5-syllable word like "동아리활동" is ~64px at 14px and ~69px at
    // 15px, but the cell only has ~58-60px to work with even at the widest
    // possible card width (the page caps out at max-w-6xl, so 1600px/1920px
    // render identically to ~1536px). 13px with tight tracking is what
    // actually fits without wrapping.
    return { tier: 1, lines: [subject], fontSizeClass: 'text-[13px]' }
  }
  if (displayLength <= 7) {
    return { tier: 2, lines: splitAtBestBreak(subject), fontSizeClass: 'text-[14px]' }
  }
  return { tier: 3, lines: splitAtBestBreak(subject), fontSizeClass: 'text-[13px]' }
}
