import { describe, expect, it } from 'vitest'
import { createRandomDrawRosterMessage } from './randomdrawIntegration'
import type { Student } from './types'

const student = (overrides: Partial<Student>): Student => ({
  id: 'id',
  teacher_id: 'teacher',
  number: 1,
  name: '학생',
  gender: null,
  birthdate: null,
  student_phone: null,
  address: null,
  father_name: null,
  father_phone: null,
  mother_name: null,
  mother_phone: null,
  emergency_contact: null,
  note: null,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('createRandomDrawRosterMessage', () => {
  it('creates a number-ordered replacement roster with supported genders only', () => {
    expect(
      createRandomDrawRosterMessage([
        student({ number: 2, name: '이학생', gender: '여자' }),
        student({ number: 1, name: '김학생', gender: '남' }),
        student({ number: 3, name: '  박학생  ', gender: '기타' }),
      ]),
    ).toEqual({
      type: 'classlog-roster-sync',
      version: 1,
      mode: 'replace',
      participants: [
        { name: '김학생', gender: 'M', ability: null },
        { name: '이학생', gender: 'F', ability: null },
        { name: '박학생', gender: null, ability: null },
      ],
    })
  })
})
