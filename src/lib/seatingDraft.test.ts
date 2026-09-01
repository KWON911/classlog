import { describe, expect, it } from 'vitest'
import { loadSeatingDraft, saveSeatingDraft, type SeatingDraft } from './seatingDraft'

describe('seating draft persistence', () => {
  it('round-trips Rules state including Map and Set values', () => {
    const draft: SeatingDraft = {
      rowsInput: 2,
      columnsInput: 3,
      teacherDirection: 'south',
      viewMode: 'back',
      seats: [{ id: 'seat-1', row: 1, column: 1, status: 'available', genderSeat: 'female' }],
      assignments: [['student-1', 'seat-1']],
      fixed: [['student-1', 'seat-1']],
      manuallyMoved: ['student-1'],
      separations: [{ student_a: 'student-1', student_b: 'student-2', type: 'diagonal' }],
      genderBalance: true,
      avoidPastNeighbors: true,
      avoidPreviousSeats: true,
      previousSeatHistoryScope: 'currentSemester',
      title: '초안 자리표',
      planDate: '2026-09-01',
      savedPlanId: 'plan-1',
    }

    saveSeatingDraft(draft)

    expect(loadSeatingDraft()).toEqual(draft)
  })

  it('ignores malformed drafts instead of breaking the seating page', () => {
    window.localStorage.setItem('classlog:seating-draft', '{malformed')

    expect(loadSeatingDraft()).toBeNull()
  })
})
