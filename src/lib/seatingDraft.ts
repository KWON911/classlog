import type {
  PreviousSeatHistoryScope,
  Seat,
  SeatSeparation,
  TeacherDirection,
} from './types'

const STORAGE_KEY = 'classlog:seating-draft'

export type SeatingDraft = {
  rowsInput: number
  columnsInput: number
  teacherDirection: TeacherDirection
  viewMode: 'teacher' | 'back'
  seats: Seat[]
  assignments: Array<[string, string]>
  fixed: Array<[string, string]>
  manuallyMoved: string[]
  separations: SeatSeparation[]
  genderBalance: boolean
  avoidPastNeighbors: boolean
  avoidPreviousSeats: boolean
  previousSeatHistoryScope: PreviousSeatHistoryScope
  title: string
  planDate: string
  savedPlanId: string | null
}

export function saveSeatingDraft(draft: SeatingDraft) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // Draft persistence is best effort; private browsing/storage limits must
    // not prevent the seating page from working.
  }
}

export function loadSeatingDraft(): SeatingDraft | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    if (!value) return null
    const draft = JSON.parse(value) as SeatingDraft
    if (!draft || !Array.isArray(draft.seats) || !Array.isArray(draft.assignments)) return null
    return draft
  } catch {
    return null
  }
}
