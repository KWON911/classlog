import type { Student } from './types'

export const RANDOMDRAW_ORIGIN = 'https://presentation-olive-xi.vercel.app'

export type RandomDrawParticipant = {
  name: string
  gender: 'M' | 'F' | null
  ability: null
}

export type RandomDrawRosterMessage = {
  type: 'classlog-roster-sync'
  version: 1
  mode: 'replace'
  participants: RandomDrawParticipant[]
}

function normalizeGender(gender: string | null) {
  const normalized = gender?.trim().toLowerCase()
  if (normalized === '남' || normalized === '남자' || normalized === 'm') return 'M' as const
  if (normalized === '여' || normalized === '여자' || normalized === 'f') return 'F' as const
  return null
}

export function createRandomDrawRosterMessage(students: Student[]): RandomDrawRosterMessage {
  return {
    type: 'classlog-roster-sync',
    version: 1,
    mode: 'replace',
    participants: students
      .filter((student) => student.name.trim())
      .sort((a, b) => a.number - b.number)
      .map((student) => ({
        name: student.name.trim(),
        gender: normalizeGender(student.gender),
        ability: null,
      })),
  }
}

export function openRandomDrawWithRoster(students: Student[]) {
  const child = window.open(`${RANDOMDRAW_ORIGIN}/`, '_blank')
  if (!child) return false

  const message = createRandomDrawRosterMessage(students)
  const sendRoster = (event: MessageEvent) => {
    if (
      event.origin !== RANDOMDRAW_ORIGIN ||
      event.source !== child ||
      event.data?.type !== 'randomdraw-ready'
    ) {
      return
    }

    child.postMessage(message, RANDOMDRAW_ORIGIN)
    window.removeEventListener('message', sendRoster)
  }

  window.addEventListener('message', sendRoster)
  window.setTimeout(() => window.removeEventListener('message', sendRoster), 15_000)
  return true
}
