# 학급 자리 배치 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the seat-shuffling app from `KWON911/-seatsuffle` (`apps/seat-change/index.html`) into Classlog as a new `/seating` page, reusing Classlog's existing `students` table instead of the original's separate roster system, with full feature parity (layout config, seat status editing, fixed seats, gender-restricted seats, separation rules, gender-balance scoring, avoid-past-neighbors, manual swap, save/load/duplicate/delete, print).

**Architecture:** One new Supabase table (`seating_plans`, JSONB-backed, one row per saved layout) replaces the original's five-table normalized schema. A pure algorithm module (`src/lib/seating.ts`) ports the original's backtracking placement/scoring/pair-derivation logic, unit-tested like `src/lib/csv.ts`. A hook (`useSeatingPlans`) follows the existing `useAttendance` hook-only Supabase-access pattern. `SeatingGrid` is a presentational component; `SeatingPage` owns all interaction state, built up incrementally across three tasks (base grid + auto-placement + manual swap, then conditions, then save/records) since it's one cohesive component that can't be meaningfully split into independently-reviewable files.

**Tech Stack:** React 19 + TypeScript, React Router 7, Supabase (`@supabase/supabase-js` v2), Tailwind CSS v4, Vitest + Testing Library.

## Global Constraints

- Supabase client (`supabase`) is imported only inside `src/lib/hooks/*.ts` — components and routes never call it directly.
- `seating_plans` RLS is a plain `teacher_id = auth.uid()` policy (no FK-based subquery) — unlike `records`/`attendance`, the `student_id` values inside its JSONB columns are opaque references scoped entirely within one teacher's own rows, so there's no cross-teacher leakage risk to guard against with a subquery.
- Automated tests exist only for `src/lib/` and `src/lib/hooks/*` — components and routes are verified via `npm run build` + `npm run lint` + manual smoke testing, not automated tests.
- Any variable referenced inside a `vi.mock(...)` factory must start with the literal prefix `mock` (e.g. `mockFrom`) — Vitest's hoisting exemption requires this exact prefix, otherwise tests throw `Cannot access before initialization`.
- Test fixtures for derivation/aggregation logic (e.g. `derivePastNeighborPairs`) must use fixtures where the correct answer differs from what a naive/broken implementation would produce — a fixture that happens to match trivially passes even when the logic is wrong.
- TypeScript `strictNullChecks` is off project-wide — do not assume the compiler will catch a `string | null` passed where a plain `string` is expected.
- There is no modal component anywhere in this codebase; keep all `/seating` UI inline on the page (sections, not a dialog), matching every other page's pattern (e.g. `StudentDetailPage`'s inline "상세정보 보기" toggle).
- Use Tailwind's built-in `print:` variant (e.g. `print:hidden`, `hidden print:block`) for print-only visibility — no custom `@media print` CSS block.
- The existing layout-route pattern (`AppShell` as a path-less `<Route element={<AppShell/>}>` wrapping children via `<Outlet/>`) must be preserved when adding the `/seating` route — this avoids the remount/loading-flash bug documented in `CLAUDE.md`.
- `SeatingPage.tsx` is built across Tasks 6, 7, and 8 as **full-file replacements**, not incremental diffs — each task's step gives the complete file contents to copy in, because the component's state is too interdependent to safely patch piecemeal across separately-reviewed tasks.

---

### Task 1: `seating_plans` table schema and TypeScript types

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `src/lib/types.ts`

**Interfaces:**
- Produces: `SeatStatus`, `TeacherDirection`, `SeatGender`, `SeparationType`, `Seat`, `SeatAssignment`, `SeatSeparation`, `SeatingPlan` types (consumed by Tasks 2–9).

- [ ] **Step 1: Add the `seating_plans` table and RLS policy to `supabase/schema.sql`**

Append to the end of `supabase/schema.sql`:

```sql
create table if not exists seating_plans (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) default auth.uid(),
  title text not null,
  plan_date date not null,
  rows integer not null,
  columns integer not null,
  teacher_direction text not null default 'north' check (teacher_direction in ('north', 'south')),
  seats jsonb not null,
  assignments jsonb not null,
  separations jsonb not null,
  gender_balance boolean not null default false,
  avoid_past_neighbors boolean not null default false,
  created_at timestamptz not null default now()
);

alter table seating_plans enable row level security;

create policy "teachers manage own seating plans" on seating_plans
  for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());
```

This is a brand-new table, so `create table if not exists` is safe to re-run against a project that already has `students`/`records`/`attendance` — no drop/recreate needed.

- [ ] **Step 2: Add the seating types to `src/lib/types.ts`**

Append to `src/lib/types.ts`:

```ts
export type SeatStatus = 'available' | 'empty' | 'disabled'
export type TeacherDirection = 'north' | 'south'
export type SeatGender = 'male' | 'female'
export type SeparationType = 'orthogonal' | 'diagonal'

export type Seat = {
  id: string
  row: number
  column: number
  status: SeatStatus
  genderSeat?: SeatGender
}

export type SeatAssignment = {
  student_id: string
  seat_id: string
  is_fixed: boolean
  source: 'manual' | 'automatic'
}

export type SeatSeparation = {
  student_a: string
  student_b: string
  type: SeparationType
}

export type SeatingPlan = {
  id: string
  teacher_id: string
  title: string
  plan_date: string
  rows: number
  columns: number
  teacher_direction: TeacherDirection
  seats: Seat[]
  assignments: SeatAssignment[]
  separations: SeatSeparation[]
  gender_balance: boolean
  avoid_past_neighbors: boolean
  created_at: string
}
```

- [ ] **Step 3: Verify the project still builds**

Run: `npm run build`
Expected: succeeds with no type errors (the new types are unused so far, which is not an error).

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql src/lib/types.ts
git commit -m "feat: add seating_plans table schema and types"
```

**Note for whoever applies this to the live Supabase project:** run the appended SQL in the Supabase SQL editor. Since `seating_plans` doesn't exist yet, this is a plain create — no need to drop other tables first.

---

### Task 2: `src/lib/seating.ts` — grid, shuffle, gender, and adjacency helpers

**Files:**
- Create: `src/lib/seating.ts`
- Test: `src/lib/seating.test.ts`

**Interfaces:**
- Consumes: `Seat`, `SeparationType` from `src/lib/types.ts` (Task 1).
- Produces: `StudentGenderBucket = 'male' | 'female' | 'unspecified'`, `mapGender(gender: string | null): StudentGenderBucket`, `createSeats(rows: number, columns: number): Seat[]`, `shuffle<T>(items: T[]): T[]`, `areAdjacent(a: Seat, b: Seat, type: SeparationType): boolean`, `canUseSeat(gender: StudentGenderBucket, seat: Seat): boolean`. All consumed by Tasks 3, 4, 6, 7, 8.

- [ ] **Step 1: Write the failing test file**

Create `src/lib/seating.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { areAdjacent, canUseSeat, createSeats, mapGender, shuffle } from './seating'

describe('createSeats', () => {
  it('creates a row-major grid with ids encoding row and column', () => {
    const seats = createSeats(2, 3)
    expect(seats).toHaveLength(6)
    expect(seats[0]).toEqual({ id: 'r1-c1', row: 1, column: 1, status: 'available' })
    expect(seats[3]).toEqual({ id: 'r2-c1', row: 2, column: 1, status: 'available' })
    expect(seats[5]).toEqual({ id: 'r2-c3', row: 2, column: 3, status: 'available' })
  })
})

describe('shuffle', () => {
  it('returns an array with the same elements, not the same reference', () => {
    const original = [1, 2, 3, 4, 5]
    const result = shuffle(original)
    expect(result).not.toBe(original)
    expect([...result].sort()).toEqual([...original].sort())
  })
})

describe('mapGender', () => {
  it('maps 남 to male, 여 to female, anything else to unspecified', () => {
    expect(mapGender('남')).toBe('male')
    expect(mapGender('여')).toBe('female')
    expect(mapGender(null)).toBe('unspecified')
    expect(mapGender('기타')).toBe('unspecified')
  })
})

describe('areAdjacent', () => {
  const seatA = { id: 'r1-c1', row: 1, column: 1, status: 'available' as const }
  const seatB = { id: 'r1-c2', row: 1, column: 2, status: 'available' as const }
  const seatDiag = { id: 'r2-c2', row: 2, column: 2, status: 'available' as const }
  const seatFar = { id: 'r3-c3', row: 3, column: 3, status: 'available' as const }

  it('treats orthogonal neighbors as adjacent for both types', () => {
    expect(areAdjacent(seatA, seatB, 'orthogonal')).toBe(true)
    expect(areAdjacent(seatA, seatB, 'diagonal')).toBe(true)
  })

  it('treats diagonal neighbors as adjacent only for the diagonal type', () => {
    expect(areAdjacent(seatA, seatDiag, 'orthogonal')).toBe(false)
    expect(areAdjacent(seatA, seatDiag, 'diagonal')).toBe(true)
  })

  it('treats far-apart seats as not adjacent for either type', () => {
    expect(areAdjacent(seatA, seatFar, 'orthogonal')).toBe(false)
    expect(areAdjacent(seatA, seatFar, 'diagonal')).toBe(false)
  })
})

describe('canUseSeat', () => {
  const openSeat = { id: 'r1-c1', row: 1, column: 1, status: 'available' as const }
  const maleSeat = {
    id: 'r1-c2',
    row: 1,
    column: 2,
    status: 'available' as const,
    genderSeat: 'male' as const,
  }

  it('allows any gender on a seat with no gender restriction', () => {
    expect(canUseSeat('male', openSeat)).toBe(true)
    expect(canUseSeat('female', openSeat)).toBe(true)
    expect(canUseSeat('unspecified', openSeat)).toBe(true)
  })

  it('only allows the matching gender on a gender-restricted seat', () => {
    expect(canUseSeat('male', maleSeat)).toBe(true)
    expect(canUseSeat('female', maleSeat)).toBe(false)
    expect(canUseSeat('unspecified', maleSeat)).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- seating`
Expected: FAIL — `Failed to resolve import "./seating"` (the module doesn't exist yet).

- [ ] **Step 3: Implement the module**

Create `src/lib/seating.ts`:

```ts
import type { Seat, SeparationType } from './types'

export type StudentGenderBucket = 'male' | 'female' | 'unspecified'

export function mapGender(gender: string | null): StudentGenderBucket {
  if (gender === '남') return 'male'
  if (gender === '여') return 'female'
  return 'unspecified'
}

export function createSeats(rows: number, columns: number): Seat[] {
  const seats: Seat[] = []
  for (let row = 1; row <= rows; row++) {
    for (let column = 1; column <= columns; column++) {
      seats.push({ id: `r${row}-c${column}`, row, column, status: 'available' })
    }
  }
  return seats
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function areAdjacent(a: Seat, b: Seat, type: SeparationType): boolean {
  const rowDiff = Math.abs(a.row - b.row)
  const columnDiff = Math.abs(a.column - b.column)
  return type === 'diagonal' ? Math.max(rowDiff, columnDiff) <= 1 : rowDiff + columnDiff === 1
}

export function canUseSeat(gender: StudentGenderBucket, seat: Seat): boolean {
  return !seat.genderSeat || gender === seat.genderSeat
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- seating`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/seating.ts src/lib/seating.test.ts
git commit -m "feat: add seating grid/shuffle/gender/adjacency helpers"
```

---

### Task 3: `src/lib/seating.ts` — `placeStudents` backtracking placement

**Files:**
- Modify: `src/lib/seating.ts`
- Modify: `src/lib/seating.test.ts`

**Interfaces:**
- Consumes: `Seat`, `SeatSeparation` from `src/lib/types.ts` (Task 1); `shuffle`, `areAdjacent`, `canUseSeat`, `StudentGenderBucket` from Task 2.
- Produces: `PlacementConstraints = { fixed: Map<string, string>; separations: SeatSeparation[]; avoidPairs: Set<string> }`, `placeStudents(students: { id: string; gender: StudentGenderBucket }[], seats: Seat[], constraints: PlacementConstraints): Map<string, string>`, and a module-private `pairKey(a, b)` helper reused by Task 4. Consumed by Tasks 4, 6, 7, 8.

- [ ] **Step 1: Add the failing tests**

Append to `src/lib/seating.test.ts` (add `placeStudents` to the existing import from `./seating`):

```ts
import { areAdjacent, canUseSeat, createSeats, mapGender, placeStudents, shuffle } from './seating'
```

Then append at the end of the file:

```ts
describe('placeStudents', () => {
  it('throws when there are more students than available seats', () => {
    const seats = createSeats(1, 2)
    const students = [
      { id: 's1', gender: 'unspecified' as const },
      { id: 's2', gender: 'unspecified' as const },
      { id: 's3', gender: 'unspecified' as const },
    ]
    expect(() =>
      placeStudents(students, seats, { fixed: new Map(), separations: [], avoidPairs: new Set() }),
    ).toThrow('학생 3명에 비해 사용 가능한 좌석이 2개입니다.')
  })

  it('keeps a fixed student on their assigned seat', () => {
    const seats = createSeats(1, 3)
    const students = [
      { id: 's1', gender: 'unspecified' as const },
      { id: 's2', gender: 'unspecified' as const },
      { id: 's3', gender: 'unspecified' as const },
    ]
    const fixed = new Map([['s1', 'r1-c2']])
    const result = placeStudents(students, seats, { fixed, separations: [], avoidPairs: new Set() })
    expect(result.get('s1')).toBe('r1-c2')
    expect(result.size).toBe(3)
  })

  it('throws when two students with an orthogonal separation cannot avoid being adjacent', () => {
    const seats = createSeats(1, 2)
    const students = [
      { id: 's1', gender: 'unspecified' as const },
      { id: 's2', gender: 'unspecified' as const },
    ]
    const separations = [{ student_a: 's1', student_b: 's2', type: 'orthogonal' as const }]
    expect(() =>
      placeStudents(students, seats, { fixed: new Map(), separations, avoidPairs: new Set() }),
    ).toThrow(
      '현재 고정·분리·성별 자리 조건을 동시에 만족하는 자리를 찾지 못했습니다. 조건이나 좌석 수를 확인해 주세요.',
    )
  })

  it('respects a diagonal separation rule across multiple runs', () => {
    const seats = createSeats(2, 3)
    const students = [
      { id: 's1', gender: 'unspecified' as const },
      { id: 's2', gender: 'unspecified' as const },
    ]
    const separations = [{ student_a: 's1', student_b: 's2', type: 'diagonal' as const }]
    const seatById = new Map(seats.map((s) => [s.id, s]))
    for (let i = 0; i < 20; i++) {
      const result = placeStudents(students, seats, { fixed: new Map(), separations, avoidPairs: new Set() })
      const seatA = seatById.get(result.get('s1')!)!
      const seatB = seatById.get(result.get('s2')!)!
      const dr = Math.abs(seatA.row - seatB.row)
      const dc = Math.abs(seatA.column - seatB.column)
      expect(Math.max(dr, dc)).toBeGreaterThan(1)
    }
  })

  it('only places a gender-restricted seat with a matching-gender student', () => {
    const seats = createSeats(1, 2)
    seats[0].genderSeat = 'male'
    const students = [
      { id: 's1', gender: 'female' as const },
      { id: 's2', gender: 'male' as const },
    ]
    const result = placeStudents(students, seats, { fixed: new Map(), separations: [], avoidPairs: new Set() })
    expect(result.get('s2')).toBe('r1-c1')
    expect(result.get('s1')).toBe('r1-c2')
  })

  it('throws when a fixed seat conflicts with a gender-restricted seat', () => {
    const seats = createSeats(1, 1)
    seats[0].genderSeat = 'female'
    const students = [{ id: 's1', gender: 'male' as const }]
    const fixed = new Map([['s1', 'r1-c1']])
    expect(() =>
      placeStudents(students, seats, { fixed, separations: [], avoidPairs: new Set() }),
    ).toThrow('고정 조건과 성별 지정 좌석이 맞지 않습니다.')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- seating`
Expected: FAIL — `placeStudents` is not exported yet.

- [ ] **Step 3: Implement `placeStudents`**

Modify the top import line in `src/lib/seating.ts`:

```ts
import type { Seat, SeatSeparation, SeparationType } from './types'
```

Append to the end of `src/lib/seating.ts`:

```ts
export type PlacementConstraints = {
  fixed: Map<string, string>
  separations: SeatSeparation[]
  avoidPairs: Set<string>
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('::')
}

export function placeStudents(
  students: { id: string; gender: StudentGenderBucket }[],
  seats: Seat[],
  constraints: PlacementConstraints,
): Map<string, string> {
  const usable = seats.filter((seat) => seat.status === 'available')
  if (students.length > usable.length) {
    throw new Error(`학생 ${students.length}명에 비해 사용 가능한 좌석이 ${usable.length}개입니다.`)
  }

  const seatById = new Map(usable.map((seat) => [seat.id, seat]))
  const genderById = new Map(students.map((student) => [student.id, student.gender]))

  function isSeatTaken(placed: Map<string, string>, seatId: string): boolean {
    for (const takenSeatId of placed.values()) {
      if (takenSeatId === seatId) return true
    }
    return false
  }

  function validPlacement(studentId: string, seatId: string, placed: Map<string, string>): boolean {
    const seat = seatById.get(seatId)!
    for (const rule of constraints.separations) {
      const otherId =
        rule.student_a === studentId ? rule.student_b : rule.student_b === studentId ? rule.student_a : null
      if (otherId && placed.has(otherId)) {
        const otherSeat = seatById.get(placed.get(otherId)!)!
        if (areAdjacent(seat, otherSeat, rule.type)) return false
      }
    }
    for (const [otherId, otherSeatId] of placed) {
      const otherSeat = seatById.get(otherSeatId)!
      if (seat.row === otherSeat.row && Math.abs(seat.column - otherSeat.column) === 1) {
        if (constraints.avoidPairs.has(pairKey(studentId, otherId))) return false
      }
    }
    return true
  }

  const placed = new Map<string, string>()

  for (const [studentId, seatId] of constraints.fixed) {
    const gender = genderById.get(studentId)
    const seat = seatById.get(seatId)
    if (!gender || !seat || isSeatTaken(placed, seatId) || !canUseSeat(gender, seat)) {
      throw new Error('고정 조건과 성별 지정 좌석이 맞지 않습니다.')
    }
    if (!validPlacement(studentId, seatId, placed)) {
      throw new Error('고정된 학생 사이의 분리 조건을 만족할 수 없습니다.')
    }
    placed.set(studentId, seatId)
  }

  const remaining = shuffle(students.filter((student) => !placed.has(student.id))).sort((a, b) => {
    const countFor = (id: string) =>
      constraints.separations.filter((rule) => rule.student_a === id || rule.student_b === id).length
    return countFor(b.id) - countFor(a.id)
  })

  let nodes = 0
  function place(index: number): boolean {
    if (index === remaining.length) return true
    if (++nodes > 30000) return false
    const student = remaining[index]
    const candidateSeats = shuffle(
      usable.filter((seat) => !isSeatTaken(placed, seat.id) && canUseSeat(student.gender, seat)),
    )
    for (const seat of candidateSeats) {
      if (validPlacement(student.id, seat.id, placed)) {
        placed.set(student.id, seat.id)
        if (place(index + 1)) return true
        placed.delete(student.id)
      }
    }
    return false
  }

  if (!place(0)) {
    throw new Error(
      '현재 고정·분리·성별 자리 조건을 동시에 만족하는 자리를 찾지 못했습니다. 조건이나 좌석 수를 확인해 주세요.',
    )
  }

  return placed
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- seating`
Expected: PASS (13 tests total).

- [ ] **Step 5: Commit**

```bash
git add src/lib/seating.ts src/lib/seating.test.ts
git commit -m "feat: add backtracking seat placement algorithm"
```

---

### Task 4: `src/lib/seating.ts` — scoring, best-of-60 search, and past-neighbor derivation

**Files:**
- Modify: `src/lib/seating.ts`
- Modify: `src/lib/seating.test.ts`

**Interfaces:**
- Consumes: `Seat`, `SeatingPlan` from `src/lib/types.ts` (Task 1); `areAdjacent`, `StudentGenderBucket`, `placeStudents`, `PlacementConstraints`, module-private `pairKey` from Tasks 2–3.
- Produces: `scorePlacement(candidate, students, seats, options): number`, `generatePlacement(students, seats, constraints, options): Map<string, string>`, `derivePastNeighborPairs(plans: SeatingPlan[]): Set<string>`. Consumed by Tasks 7, 8.

- [ ] **Step 1: Add the failing tests**

Append to `src/lib/seating.test.ts` (update the import line to add the three new functions, and add a `SeatingPlan` type import):

```ts
import {
  areAdjacent,
  canUseSeat,
  createSeats,
  derivePastNeighborPairs,
  generatePlacement,
  mapGender,
  placeStudents,
  scorePlacement,
  shuffle,
} from './seating'
import type { SeatingPlan } from './types'
```

Then append at the end of the file:

```ts
describe('scorePlacement', () => {
  const seats = createSeats(1, 2)
  const students = [
    { id: 's1', gender: 'male' as const },
    { id: 's2', gender: 'male' as const },
  ]

  it('penalizes adjacent same-gender students when gender balance is on', () => {
    const candidate = new Map([
      ['s1', 'r1-c1'],
      ['s2', 'r1-c2'],
    ])
    const score = scorePlacement(candidate, students, seats, {
      genderBalance: true,
      previousAssignments: new Map(),
    })
    expect(score).toBe(1)
  })

  it('does not penalize when gender balance is off', () => {
    const candidate = new Map([
      ['s1', 'r1-c1'],
      ['s2', 'r1-c2'],
    ])
    const score = scorePlacement(candidate, students, seats, {
      genderBalance: false,
      previousAssignments: new Map(),
    })
    expect(score).toBe(0)
  })

  it('rewards keeping a student in their previous seat', () => {
    const candidate = new Map([['s1', 'r1-c1']])
    const score = scorePlacement(candidate, [students[0]], seats, {
      genderBalance: false,
      previousAssignments: new Map([['s1', 'r1-c1']]),
    })
    expect(score).toBe(8)
  })
})

describe('generatePlacement', () => {
  it('returns a full placement across the 60-candidate search', () => {
    const seats = createSeats(1, 3)
    const students = [
      { id: 's1', gender: 'unspecified' as const },
      { id: 's2', gender: 'unspecified' as const },
      { id: 's3', gender: 'unspecified' as const },
    ]
    const result = generatePlacement(
      students,
      seats,
      { fixed: new Map(), separations: [], avoidPairs: new Set() },
      { genderBalance: false, previousAssignments: new Map() },
    )
    expect(result.size).toBe(3)
  })
})

describe('derivePastNeighborPairs', () => {
  function plan(overrides: Partial<SeatingPlan>): SeatingPlan {
    return {
      id: 'p1',
      teacher_id: 't1',
      title: '1차',
      plan_date: '2026-08-01',
      rows: 1,
      columns: 3,
      teacher_direction: 'north',
      seats: createSeats(1, 3),
      assignments: [],
      separations: [],
      gender_balance: false,
      avoid_past_neighbors: false,
      created_at: '2026-08-01',
      ...overrides,
    }
  }

  it('pairs students seated in adjacent columns, but not students two seats apart', () => {
    const plans = [
      plan({
        assignments: [
          { student_id: 's1', seat_id: 'r1-c1', is_fixed: false, source: 'automatic' },
          { student_id: 's2', seat_id: 'r1-c2', is_fixed: false, source: 'automatic' },
          { student_id: 's3', seat_id: 'r1-c3', is_fixed: false, source: 'automatic' },
        ],
      }),
    ]

    const pairs = derivePastNeighborPairs(plans)

    expect(pairs.has(['s1', 's2'].sort().join('::'))).toBe(true)
    expect(pairs.has(['s2', 's3'].sort().join('::'))).toBe(true)
    expect(pairs.has(['s1', 's3'].sort().join('::'))).toBe(false)
  })

  it('merges pairs across multiple plans', () => {
    const plans = [
      plan({
        assignments: [
          { student_id: 's1', seat_id: 'r1-c1', is_fixed: false, source: 'automatic' },
          { student_id: 's2', seat_id: 'r1-c2', is_fixed: false, source: 'automatic' },
        ],
      }),
      plan({
        id: 'p2',
        assignments: [
          { student_id: 's3', seat_id: 'r1-c1', is_fixed: false, source: 'automatic' },
          { student_id: 's4', seat_id: 'r1-c2', is_fixed: false, source: 'automatic' },
        ],
      }),
    ]

    const pairs = derivePastNeighborPairs(plans)
    expect(pairs.size).toBe(2)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- seating`
Expected: FAIL — `scorePlacement`, `generatePlacement`, `derivePastNeighborPairs` are not exported yet.

- [ ] **Step 3: Implement the three functions**

Modify the top import line in `src/lib/seating.ts`:

```ts
import type { Seat, SeatingPlan, SeatSeparation, SeparationType } from './types'
```

Append to the end of `src/lib/seating.ts`:

```ts
export function scorePlacement(
  candidate: Map<string, string>,
  students: { id: string; gender: StudentGenderBucket }[],
  seats: Seat[],
  options: { genderBalance: boolean; previousAssignments: Map<string, string> },
): number {
  let total = 0
  const seatById = new Map(seats.map((seat) => [seat.id, seat]))
  const genderById = new Map(students.map((student) => [student.id, student.gender]))
  const entries = [...candidate.entries()]

  if (options.genderBalance) {
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [studentA, seatIdA] = entries[i]
        const [studentB, seatIdB] = entries[j]
        const genderA = genderById.get(studentA)
        const genderB = genderById.get(studentB)
        if (
          genderA &&
          genderB &&
          genderA !== 'unspecified' &&
          genderA === genderB &&
          areAdjacent(seatById.get(seatIdA)!, seatById.get(seatIdB)!, 'orthogonal')
        ) {
          total += 1
        }
      }
    }
  }

  for (const [studentId, seatId] of candidate) {
    if (options.previousAssignments.get(studentId) === seatId) {
      total += 8
    }
  }

  return total
}

export function generatePlacement(
  students: { id: string; gender: StudentGenderBucket }[],
  seats: Seat[],
  constraints: PlacementConstraints,
  options: { genderBalance: boolean; previousAssignments: Map<string, string> },
): Map<string, string> {
  let best: Map<string, string> | null = null
  let bestScore = Infinity
  for (let i = 0; i < 60; i++) {
    const candidate = placeStudents(students, seats, constraints)
    const candidateScore = scorePlacement(candidate, students, seats, options)
    if (candidateScore < bestScore || (candidateScore === bestScore && Math.random() < 0.5)) {
      best = candidate
      bestScore = candidateScore
    }
  }
  return best!
}

export function derivePastNeighborPairs(plans: SeatingPlan[]): Set<string> {
  const pairs = new Set<string>()
  for (const plan of plans) {
    const studentBySeatId = new Map(
      plan.assignments.map((assignment) => [assignment.seat_id, assignment.student_id]),
    )
    for (const seat of plan.seats) {
      const studentId = studentBySeatId.get(seat.id)
      if (!studentId) continue
      const neighborSeat = plan.seats.find(
        (other) => other.row === seat.row && other.column === seat.column + 1,
      )
      if (!neighborSeat) continue
      const neighborStudentId = studentBySeatId.get(neighborSeat.id)
      if (!neighborStudentId) continue
      pairs.add(pairKey(studentId, neighborStudentId))
    }
  }
  return pairs
}
```

`derivePastNeighborPairs` reuses the module-private `pairKey` defined in Task 3 — no new helper needed.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- seating`
Expected: PASS (18 tests total).

- [ ] **Step 5: Commit**

```bash
git add src/lib/seating.ts src/lib/seating.test.ts
git commit -m "feat: add placement scoring, best-of-60 search, and past-neighbor derivation"
```

---

### Task 5: `useSeatingPlans` hook

**Files:**
- Create: `src/lib/hooks/useSeatingPlans.ts`
- Test: `src/lib/hooks/useSeatingPlans.test.ts`

**Interfaces:**
- Consumes: `SeatingPlan` from `src/lib/types.ts` (Task 1). Existing `createQueryBuilder` from `src/test/supabaseMock.ts` (already supports `select`/`gte`/`lt`/`insert`/`update`/`delete`/`eq`/`order` — no mock changes needed).
- Produces: `SeatingPlanInput = Omit<SeatingPlan, 'id' | 'teacher_id' | 'created_at'>`, `useSeatingPlans(yearMonth: string): { plans: SeatingPlan[], loading: boolean, error: string | null, savePlan(id: string | null, input: SeatingPlanInput): Promise<{ data?: SeatingPlan, error?: string }>, deletePlan(id: string): Promise<{ error?: string }>, refetch: () => Promise<void> }`. Consumed by Task 8 (`SeatingPage`).

- [ ] **Step 1: Write the failing test file**

Create `src/lib/hooks/useSeatingPlans.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createQueryBuilder } from '../../test/supabaseMock'

const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  },
}))

const { useSeatingPlans } = await import('./useSeatingPlans')

const planA = {
  id: 'p1',
  teacher_id: 't1',
  title: '1차 자리표',
  plan_date: '2026-08-05',
  rows: 1,
  columns: 2,
  teacher_direction: 'north' as const,
  seats: [],
  assignments: [],
  separations: [],
  gender_balance: false,
  avoid_past_neighbors: false,
  created_at: '2026-08-05',
}

const planB = { ...planA, id: 'p2', title: '2차 자리표', plan_date: '2026-08-20', created_at: '2026-08-20' }

beforeEach(() => {
  mockFrom.mockReset()
  mockGetUser.mockReset()
})

describe('useSeatingPlans', () => {
  it('fetches plans within the given month range, newest first', async () => {
    const builder = createQueryBuilder({ data: [planB, planA], error: null })
    mockFrom.mockReturnValue(builder)

    const { result } = renderHook(() => useSeatingPlans('2026-08'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(builder.gte).toHaveBeenCalledWith('plan_date', '2026-08-01')
    expect(builder.lt).toHaveBeenCalledWith('plan_date', '2026-09-01')
    expect(result.current.plans).toEqual([planB, planA])
  })

  it('surfaces the error message when fetch fails', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: { message: '네트워크 오류' } }))

    const { result } = renderHook(() => useSeatingPlans('2026-08'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('네트워크 오류')
  })

  it('inserts a new plan when no id is given', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [], error: null }))
    const { result } = renderHook(() => useSeatingPlans('2026-08'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetUser.mockResolvedValue({ data: { user: { id: 't1' } } })
    const insertBuilder = createQueryBuilder({ data: planA, error: null })
    mockFrom.mockReturnValueOnce(insertBuilder)

    const { id, teacher_id, created_at, ...input } = planA
    await act(async () => {
      await result.current.savePlan(null, input)
    })

    expect(insertBuilder.insert).toHaveBeenCalledWith({ ...input, teacher_id: 't1' })
    expect(result.current.plans).toEqual([planA])
  })

  it('updates an existing plan when an id is given', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [planA], error: null }))
    const { result } = renderHook(() => useSeatingPlans('2026-08'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetUser.mockResolvedValue({ data: { user: { id: 't1' } } })
    const updated = { ...planA, title: '수정된 제목' }
    const updateBuilder = createQueryBuilder({ data: updated, error: null })
    mockFrom.mockReturnValueOnce(updateBuilder)

    const { id, teacher_id, created_at, ...input } = updated
    await act(async () => {
      await result.current.savePlan('p1', input)
    })

    expect(updateBuilder.update).toHaveBeenCalledWith(input)
    expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'p1')
    expect(result.current.plans).toEqual([updated])
  })

  it('deletes a plan by id', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [planA], error: null }))
    const { result } = renderHook(() => useSeatingPlans('2026-08'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const deleteBuilder = createQueryBuilder({ data: null, error: null })
    mockFrom.mockReturnValueOnce(deleteBuilder)

    await act(async () => {
      await result.current.deletePlan('p1')
    })

    expect(deleteBuilder.eq).toHaveBeenCalledWith('id', 'p1')
    expect(result.current.plans).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- useSeatingPlans`
Expected: FAIL — `Failed to resolve import "./useSeatingPlans"`.

- [ ] **Step 3: Implement the hook**

Create `src/lib/hooks/useSeatingPlans.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { SeatingPlan } from '../types'

export type SeatingPlanInput = Omit<SeatingPlan, 'id' | 'teacher_id' | 'created_at'>

function monthRange(yearMonth: string) {
  const [yearStr, monthStr] = yearMonth.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const start = `${yearMonth}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
  return { start, end }
}

export function useSeatingPlans(yearMonth: string) {
  const [plans, setPlans] = useState<SeatingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { start, end } = monthRange(yearMonth)
    const { data, error } = await supabase
      .from('seating_plans')
      .select('*')
      .gte('plan_date', start)
      .lt('plan_date', end)
      .order('plan_date', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setPlans(data ?? [])
    }
    setLoading(false)
  }, [yearMonth])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const savePlan = useCallback(async (id: string | null, input: SeatingPlanInput) => {
    const { data: userData } = await supabase.auth.getUser()
    const teacherId = userData.user?.id
    if (!teacherId) {
      setError('로그인이 필요합니다.')
      return { error: '로그인이 필요합니다.' }
    }

    if (id) {
      const { data, error } = await supabase
        .from('seating_plans')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        setError(error.message)
        return { error: error.message }
      }

      setPlans((prev) =>
        prev.map((p) => (p.id === id ? data : p)).sort((a, b) => b.plan_date.localeCompare(a.plan_date)),
      )
      return { data }
    }

    const { data, error } = await supabase
      .from('seating_plans')
      .insert({ ...input, teacher_id: teacherId })
      .select()
      .single()

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setPlans((prev) => [data, ...prev].sort((a, b) => b.plan_date.localeCompare(a.plan_date)))
    return { data }
  }, [])

  const deletePlan = useCallback(async (id: string) => {
    const { error } = await supabase.from('seating_plans').delete().eq('id', id)

    if (error) {
      setError(error.message)
      return { error: error.message }
    }

    setPlans((prev) => prev.filter((p) => p.id !== id))
    return {}
  }, [])

  return { plans, loading, error, savePlan, deletePlan, refetch: fetchPlans }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- useSeatingPlans`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/hooks/useSeatingPlans.ts src/lib/hooks/useSeatingPlans.test.ts
git commit -m "feat: add useSeatingPlans hook for saving/loading seating plans"
```

---

### Task 6: `SeatingGrid` component + base `SeatingPage` (layout config, grid, unconstrained auto-placement, manual swap)

**Files:**
- Create: `src/components/SeatingGrid.tsx`
- Create: `src/routes/SeatingPage.tsx`

**Interfaces:**
- Consumes: `Seat`, `Student`, `TeacherDirection` from `src/lib/types.ts`; `createSeats`, `generatePlacement`, `mapGender` from `src/lib/seating.ts` (Tasks 2, 4); `useStudents()` (existing).
- Produces: `SeatingGrid` component (props below), `SeatingPage` component. `SeatingPage` is rewritten wholesale in Tasks 7 and 8 — this task's version only needs to support layout config, unconstrained auto-placement, and manual seat swapping.

- [ ] **Step 1: Create the presentational grid component**

Create `src/components/SeatingGrid.tsx`:

```tsx
import type { Seat, Student, TeacherDirection } from '../lib/types'

type SeatingGridProps = {
  seats: Seat[]
  columns: number
  teacherDirection: TeacherDirection
  viewMode: 'teacher' | 'back'
  assignments: Map<string, string>
  students: Student[]
  fixedSeatIds: Set<string>
  selectedSeatId: string | null
  onSeatClick: (seatId: string) => void
}

function displayPosition(seat: Seat, rows: number, columns: number, viewMode: 'teacher' | 'back') {
  if (viewMode !== 'back') return { row: seat.row, column: seat.column }
  return { row: rows + 1 - seat.row, column: columns + 1 - seat.column }
}

function seatClassName(seat: Seat, isFixed: boolean, isSelected: boolean) {
  const classes = ['min-h-[70px]', 'rounded', 'border', 'p-2', 'text-center', 'text-xs']
  if (seat.status === 'disabled') classes.push('border-dashed', 'bg-gray-200', 'text-gray-500')
  else if (seat.status === 'empty') classes.push('border-yellow-400', 'bg-yellow-50')
  else if (isFixed) classes.push('border-green-500', 'bg-green-50')
  else if (seat.genderSeat === 'male') classes.push('border-blue-400', 'bg-blue-50')
  else if (seat.genderSeat === 'female') classes.push('border-pink-400', 'bg-pink-50')
  else classes.push('border-gray-300', 'bg-white')
  if (isSelected) classes.push('ring-2', 'ring-yellow-500')
  return classes.join(' ')
}

export function SeatingGrid({
  seats,
  columns,
  teacherDirection,
  viewMode,
  assignments,
  students,
  fixedSeatIds,
  selectedSeatId,
  onSeatClick,
}: SeatingGridProps) {
  const rows = seats.reduce((max, seat) => Math.max(max, seat.row), 0)
  const studentBySeatId = new Map<string, Student>()
  for (const student of students) {
    const seatId = assignments.get(student.id)
    if (seatId) studentBySeatId.set(seatId, student)
  }

  const deskAtBottom = (teacherDirection === 'south') !== (viewMode === 'back')

  const sortedSeats = [...seats].sort((a, b) => {
    const posA = displayPosition(a, rows, columns, viewMode)
    const posB = displayPosition(b, rows, columns, viewMode)
    return posA.row - posB.row || posA.column - posB.column
  })

  const desk = (
    <div className="mx-auto w-fit rounded border-2 border-green-800 bg-green-700 px-6 py-2 text-center font-bold text-white">
      칠판
    </div>
  )

  return (
    <div className="mb-8">
      {!deskAtBottom && <div className="mb-4">{desk}</div>}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(58px, 1fr))` }}>
        {sortedSeats.map((seat) => {
          const pos = displayPosition(seat, rows, columns, viewMode)
          const student = studentBySeatId.get(seat.id)
          const isFixed = fixedSeatIds.has(seat.id)
          return (
            <button
              key={seat.id}
              type="button"
              onClick={() => onSeatClick(seat.id)}
              style={{ gridRow: pos.row, gridColumn: pos.column }}
              className={seatClassName(seat, isFixed, seat.id === selectedSeatId)}
            >
              {isFixed && <div className="text-[10px]">🔒</div>}
              <div className="mb-1 text-gray-500">
                {seat.row}행 {seat.column}열
              </div>
              {seat.status === 'disabled' ? (
                <strong>사용 안 함</strong>
              ) : seat.status === 'empty' ? (
                <strong className="text-yellow-700">빈자리</strong>
              ) : student ? (
                <strong>{student.name}</strong>
              ) : (
                <strong>—</strong>
              )}
            </button>
          )
        })}
      </div>
      {deskAtBottom && <div className="mt-4">{desk}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Create the base seating page**

Create `src/routes/SeatingPage.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { useStudents } from '../lib/hooks/useStudents'
import { SeatingGrid } from '../components/SeatingGrid'
import { createSeats, generatePlacement, mapGender } from '../lib/seating'
import type { Seat, TeacherDirection } from '../lib/types'

type ActiveTool = { type: 'swap'; firstStudentId: string | null }

export function SeatingPage() {
  const { students } = useStudents()

  const [rowsInput, setRowsInput] = useState(5)
  const [columnsInput, setColumnsInput] = useState(6)
  const [teacherDirection, setTeacherDirection] = useState<TeacherDirection>('north')
  const [viewMode, setViewMode] = useState<'teacher' | 'back'>('teacher')
  const [seats, setSeats] = useState<Seat[]>(() => createSeats(5, 6))
  const [assignments, setAssignments] = useState<Map<string, string>>(new Map())
  const [seatEditMode, setSeatEditMode] = useState<'empty' | 'disabled' | null>(null)
  const [activeTool, setActiveTool] = useState<ActiveTool | null>(null)
  const [message, setMessage] = useState('학생 명단을 불러온 뒤 자리 배치 시작을 눌러 주세요.')
  const [errorMessage, setErrorMessage] = useState('')

  const columns = useMemo(() => seats.reduce((max, s) => Math.max(max, s.column), 0), [seats])
  const studentNameById = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students])

  function studentIdAtSeat(seatId: string): string | null {
    for (const [studentId, assignedSeatId] of assignments) {
      if (assignedSeatId === seatId) return studentId
    }
    return null
  }

  function applyLayout() {
    if (
      !Number.isInteger(rowsInput) ||
      !Number.isInteger(columnsInput) ||
      rowsInput < 1 ||
      columnsInput < 1 ||
      rowsInput > 12 ||
      columnsInput > 12
    ) {
      setErrorMessage('행과 열은 각각 1부터 12까지 입력해 주세요.')
      return
    }
    if (assignments.size && !window.confirm('좌석 구조를 바꾸면 현재 배치와 조건이 초기화됩니다. 계속할까요?')) {
      return
    }
    setSeats(createSeats(rowsInput, columnsInput))
    setAssignments(new Map())
    setActiveTool(null)
    setErrorMessage('')
    setMessage(`${rowsInput}행 ${columnsInput}열 좌석 구조를 만들었습니다.`)
  }

  function toggleSeatEditMode() {
    setActiveTool(null)
    setSeatEditMode((prev) => (prev === 'empty' ? 'disabled' : 'empty'))
  }

  function handleSeatClick(seatId: string) {
    const seat = seats.find((s) => s.id === seatId)
    if (!seat) return

    if (activeTool?.type === 'swap') {
      const studentId = studentIdAtSeat(seatId)
      if (!studentId) {
        setMessage('학생이 배치된 자리만 선택할 수 있습니다.')
        return
      }
      if (!activeTool.firstStudentId) {
        setActiveTool({ type: 'swap', firstStudentId: studentId })
        setMessage(
          `${studentNameById.get(studentId) ?? '첫 번째 학생'}을 선택했습니다. 바꿀 두 번째 학생 자리를 클릭해 주세요.`,
        )
        return
      }
      if (activeTool.firstStudentId === studentId) {
        setMessage('서로 다른 두 학생을 선택해 주세요.')
        return
      }
      const firstId = activeTool.firstStudentId
      const firstSeatId = assignments.get(firstId)!
      const secondSeatId = assignments.get(studentId)!
      setAssignments((prev) => {
        const next = new Map(prev)
        next.set(firstId, secondSeatId)
        next.set(studentId, firstSeatId)
        return next
      })
      setActiveTool(null)
      setMessage(
        `${studentNameById.get(firstId) ?? ''}과(와) ${studentNameById.get(studentId) ?? ''}의 자리를 맞바꿨습니다.`,
      )
      return
    }

    const occupiedStudentId = studentIdAtSeat(seatId)
    if (occupiedStudentId) {
      setActiveTool({ type: 'swap', firstStudentId: occupiedStudentId })
      setMessage(
        `${studentNameById.get(occupiedStudentId) ?? '첫 번째 학생'}을 선택했습니다. 바꿀 두 번째 학생 자리를 클릭해 주세요.`,
      )
      return
    }

    if (seatEditMode) {
      const mode = seatEditMode
      setSeats((prev) =>
        prev.map((s) => (s.id === seatId ? { ...s, status: s.status === mode ? 'available' : mode } : s)),
      )
    }
  }

  function generate() {
    setErrorMessage('')
    setActiveTool(null)
    if (!students.length) {
      setErrorMessage('먼저 학생 명단을 불러와 주세요.')
      return
    }
    try {
      const result = generatePlacement(
        students.map((s) => ({ id: s.id, gender: mapGender(s.gender) })),
        seats,
        { fixed: new Map(), separations: [], avoidPairs: new Set() },
        { genderBalance: false, previousAssignments: new Map() },
      )
      setAssignments(result)
      setMessage('새 자리표를 만들었습니다.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '자리 배치 중 문제가 발생했습니다.')
    }
  }

  function clearPlacement() {
    setActiveTool(null)
    setAssignments(new Map())
    setMessage('현재 배치를 초기화했습니다.')
  }

  const selectedSeatId =
    activeTool?.type === 'swap' && activeTool.firstStudentId
      ? (assignments.get(activeTool.firstStudentId) ?? null)
      : null

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">학급 자리 배치</h1>
      <p className="mb-4 text-sm text-gray-600">학생 {students.length}명</p>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded border border-gray-200 p-4">
        <label className="flex flex-col gap-1 text-sm">
          행
          <input
            type="number"
            min={1}
            max={12}
            value={rowsInput}
            onChange={(e) => setRowsInput(Number(e.target.value))}
            className="w-20 rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          열
          <input
            type="number"
            min={1}
            max={12}
            value={columnsInput}
            onChange={(e) => setColumnsInput(Number(e.target.value))}
            className="w-20 rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          칠판 방향
          <select
            value={teacherDirection}
            onChange={(e) => setTeacherDirection(e.target.value as TeacherDirection)}
            className="rounded border border-gray-300 px-2 py-1"
          >
            <option value="north">위쪽</option>
            <option value="south">아래쪽</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          보기 방향
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'teacher' | 'back')}
            className="rounded border border-gray-300 px-2 py-1"
          >
            <option value="teacher">앞에서 볼 때(교사 시점)</option>
            <option value="back">뒤에서 볼 때</option>
          </select>
        </label>
        <button onClick={applyLayout} className="rounded border border-gray-300 px-3 py-2 text-sm">
          좌석 구조 적용
        </button>
        <button
          onClick={toggleSeatEditMode}
          className={`rounded border px-3 py-2 text-sm ${seatEditMode ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}
        >
          {seatEditMode === 'disabled' ? '사용 안 함 지정 중' : seatEditMode === 'empty' ? '빈자리 지정 중' : '빈자리 지정'}
        </button>
      </div>

      {errorMessage && <p className="mb-4 text-red-600">{errorMessage}</p>}

      <SeatingGrid
        seats={seats}
        columns={columns}
        teacherDirection={teacherDirection}
        viewMode={viewMode}
        assignments={assignments}
        students={students}
        fixedSeatIds={new Set()}
        selectedSeatId={selectedSeatId}
        onSeatClick={handleSeatClick}
      />

      <p className="mb-6 text-sm text-gray-600">{message}</p>

      <div className="mb-8 flex flex-wrap gap-2">
        <button onClick={generate} className="rounded bg-blue-600 px-3 py-2 text-sm text-white">
          자리 배치 시작
        </button>
        <button onClick={generate} className="rounded border border-gray-300 px-3 py-2 text-sm">
          재배치하기
        </button>
        <button onClick={clearPlacement} className="rounded border border-gray-300 px-3 py-2 text-sm">
          초기화
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build and lint**

Run: `npm run build`
Expected: succeeds with no type errors. (`SeatingPage` isn't routed yet — that's fine, it'll be wired in Task 9. An unused-export warning, if any, is expected until then.)

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/SeatingGrid.tsx src/routes/SeatingPage.tsx
git commit -m "feat: add SeatingGrid and base SeatingPage (layout, auto-placement, manual swap)"
```

---

### Task 7: `SeatingPage` — conditions panel (fixed seats, gender-restricted seats, separation rules, gender balance)

**Files:**
- Modify: `src/routes/SeatingPage.tsx` (full-file replacement of Task 6's version)

**Interfaces:**
- Consumes: everything from Task 6, plus `SeatSeparation`, `SeatGender`, `SeparationType` from `src/lib/types.ts` (Task 1).
- Produces: the same `SeatingPage` export, now with condition-setting UI and `generate()` wired to `fixed`/`separations`/`genderBalance`. Extended again in Task 8.

- [ ] **Step 1: Replace `src/routes/SeatingPage.tsx` with the full updated contents**

```tsx
import { useMemo, useState } from 'react'
import { useStudents } from '../lib/hooks/useStudents'
import { SeatingGrid } from '../components/SeatingGrid'
import { createSeats, generatePlacement, mapGender } from '../lib/seating'
import type { Seat, SeatGender, SeatSeparation, SeparationType, TeacherDirection } from '../lib/types'

type ActiveTool =
  | { type: 'swap'; firstStudentId: string | null }
  | { type: 'fixed'; studentId: string }
  | { type: 'gender'; gender: SeatGender }

export function SeatingPage() {
  const { students } = useStudents()

  const [rowsInput, setRowsInput] = useState(5)
  const [columnsInput, setColumnsInput] = useState(6)
  const [teacherDirection, setTeacherDirection] = useState<TeacherDirection>('north')
  const [viewMode, setViewMode] = useState<'teacher' | 'back'>('teacher')
  const [seats, setSeats] = useState<Seat[]>(() => createSeats(5, 6))
  const [assignments, setAssignments] = useState<Map<string, string>>(new Map())
  const [seatEditMode, setSeatEditMode] = useState<'empty' | 'disabled' | null>(null)
  const [activeTool, setActiveTool] = useState<ActiveTool | null>(null)
  const [message, setMessage] = useState('학생 명단을 불러온 뒤 자리 배치 시작을 눌러 주세요.')
  const [errorMessage, setErrorMessage] = useState('')

  const [fixed, setFixed] = useState<Map<string, string>>(new Map())
  const [separations, setSeparations] = useState<SeatSeparation[]>([])
  const [genderBalance, setGenderBalance] = useState(false)
  const [selectedFixedStudentId, setSelectedFixedStudentId] = useState('')
  const [separationStudentA, setSeparationStudentA] = useState('')
  const [separationStudentB, setSeparationStudentB] = useState('')
  const [separationType, setSeparationType] = useState<SeparationType>('orthogonal')
  const [conditionMessage, setConditionMessage] = useState('')

  const columns = useMemo(() => seats.reduce((max, s) => Math.max(max, s.column), 0), [seats])
  const studentGenderById = useMemo(
    () => new Map(students.map((s) => [s.id, mapGender(s.gender)])),
    [students],
  )
  const studentNameById = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students])
  const hasGenderInfo = useMemo(() => students.some((s) => mapGender(s.gender) !== 'unspecified'), [students])

  function getSeat(seatId: string): Seat | undefined {
    return seats.find((s) => s.id === seatId)
  }

  function studentIdAtSeat(seatId: string): string | null {
    for (const [studentId, assignedSeatId] of assignments) {
      if (assignedSeatId === seatId) return studentId
    }
    return null
  }

  function clearCurrentPlacement() {
    if (assignments.size) {
      setAssignments(new Map())
      setMessage('조건이 바뀌었습니다. 자리 배치 시작을 눌러 다시 만들어 주세요.')
    }
  }

  function applyLayout() {
    if (
      !Number.isInteger(rowsInput) ||
      !Number.isInteger(columnsInput) ||
      rowsInput < 1 ||
      columnsInput < 1 ||
      rowsInput > 12 ||
      columnsInput > 12
    ) {
      setErrorMessage('행과 열은 각각 1부터 12까지 입력해 주세요.')
      return
    }
    if (assignments.size && !window.confirm('좌석 구조를 바꾸면 현재 배치와 조건이 초기화됩니다. 계속할까요?')) {
      return
    }
    setSeats(createSeats(rowsInput, columnsInput))
    setAssignments(new Map())
    setFixed(new Map())
    setSeparations([])
    setActiveTool(null)
    setErrorMessage('')
    setMessage(`${rowsInput}행 ${columnsInput}열 좌석 구조를 만들었습니다.`)
  }

  function toggleSeatEditMode() {
    setActiveTool(null)
    setSeatEditMode((prev) => (prev === 'empty' ? 'disabled' : 'empty'))
  }

  function startFixedTool() {
    if (!selectedFixedStudentId) {
      setConditionMessage('먼저 고정할 학생을 선택해 주세요.')
      return
    }
    setActiveTool({ type: 'fixed', studentId: selectedFixedStudentId })
    setMessage(
      `${studentNameById.get(selectedFixedStudentId) ?? '선택한 학생'}의 자리를 자리표에서 직접 클릭해 주세요.`,
    )
  }

  function startGenderTool(gender: SeatGender) {
    if (!students.some((s) => mapGender(s.gender) === gender)) {
      setConditionMessage(`명단에 ${gender === 'male' ? '남학생' : '여학생'} 정보가 없습니다.`)
      return
    }
    setActiveTool({ type: 'gender', gender })
    setMessage(
      `${gender === 'male' ? '남학생' : '여학생'} 전용으로 할 자리를 직접 클릭해 주세요. 같은 자리를 다시 누르면 해제됩니다.`,
    )
  }

  function addSeparation() {
    if (!separationStudentA || !separationStudentB || separationStudentA === separationStudentB) {
      setConditionMessage('서로 다른 두 학생을 선택해 주세요.')
      return
    }
    const duplicate = separations.some(
      (item) =>
        (item.student_a === separationStudentA && item.student_b === separationStudentB) ||
        (item.student_a === separationStudentB && item.student_b === separationStudentA),
    )
    if (duplicate) {
      setConditionMessage('이미 설정된 분리 조건입니다.')
      return
    }
    setSeparations((prev) => [
      ...prev,
      { student_a: separationStudentA, student_b: separationStudentB, type: separationType },
    ])
    setConditionMessage('분리 설정을 추가했습니다.')
  }

  function removeFixed(studentId: string) {
    setFixed((prev) => {
      const next = new Map(prev)
      next.delete(studentId)
      return next
    })
    clearCurrentPlacement()
  }

  function removeGenderSeat(seatId: string) {
    setSeats((prev) => prev.map((s) => (s.id === seatId ? { ...s, genderSeat: undefined } : s)))
    clearCurrentPlacement()
  }

  function removeSeparation(index: number) {
    setSeparations((prev) => prev.filter((_, i) => i !== index))
    clearCurrentPlacement()
  }

  function handleSeatClick(seatId: string) {
    const seat = getSeat(seatId)
    if (!seat) return

    if (activeTool?.type === 'swap') {
      const studentId = studentIdAtSeat(seatId)
      if (!studentId) {
        setMessage('학생이 배치된 자리만 선택할 수 있습니다.')
        return
      }
      if (!activeTool.firstStudentId) {
        setActiveTool({ type: 'swap', firstStudentId: studentId })
        setMessage(
          `${studentNameById.get(studentId) ?? '첫 번째 학생'}을 선택했습니다. 바꿀 두 번째 학생 자리를 클릭해 주세요.`,
        )
        return
      }
      if (activeTool.firstStudentId === studentId) {
        setMessage('서로 다른 두 학생을 선택해 주세요.')
        return
      }
      const firstId = activeTool.firstStudentId
      if (fixed.has(firstId) || fixed.has(studentId)) {
        setMessage('고정된 학생의 자리는 맞바꾸기할 수 없습니다.')
        setActiveTool(null)
        return
      }
      const firstSeatId = assignments.get(firstId)!
      const secondSeatId = assignments.get(studentId)!
      const firstSeat = getSeat(firstSeatId)!
      const secondSeat = getSeat(secondSeatId)!
      const firstGender = studentGenderById.get(firstId) ?? 'unspecified'
      const secondGender = studentGenderById.get(studentId) ?? 'unspecified'
      const firstCanUseSecond = !secondSeat.genderSeat || firstGender === secondSeat.genderSeat
      const secondCanUseFirst = !firstSeat.genderSeat || secondGender === firstSeat.genderSeat
      if (!firstCanUseSecond || !secondCanUseFirst) {
        setMessage('성별 지정 좌석 조건과 맞지 않아 자리를 바꿀 수 없습니다.')
        setActiveTool(null)
        return
      }
      setAssignments((prev) => {
        const next = new Map(prev)
        next.set(firstId, secondSeatId)
        next.set(studentId, firstSeatId)
        return next
      })
      setActiveTool(null)
      setMessage(
        `${studentNameById.get(firstId) ?? ''}과(와) ${studentNameById.get(studentId) ?? ''}의 자리를 맞바꿨습니다.`,
      )
      return
    }

    if (activeTool?.type === 'fixed' || activeTool?.type === 'gender') {
      if (seat.status !== 'available') {
        setConditionMessage('사용 가능한 좌석만 지정할 수 있습니다.')
        return
      }
      if (activeTool.type === 'fixed') {
        const studentId = activeTool.studentId
        const conflictingStudentId = [...fixed.entries()].find(
          ([sid, assignedSeatId]) => assignedSeatId === seatId && sid !== studentId,
        )?.[0]
        if (conflictingStudentId) {
          setConditionMessage('이미 다른 학생이 고정된 좌석입니다.')
          return
        }
        clearCurrentPlacement()
        setFixed((prev) => new Map(prev).set(studentId, seatId))
        setActiveTool(null)
        setConditionMessage('학생 고정 자리를 지정했습니다.')
      } else {
        clearCurrentPlacement()
        const gender = activeTool.gender
        const isSameGender = seat.genderSeat === gender
        setSeats((prev) =>
          prev.map((s) => (s.id === seatId ? { ...s, genderSeat: isSameGender ? undefined : gender } : s)),
        )
        setConditionMessage(
          isSameGender
            ? `${gender === 'male' ? '남학생' : '여학생'} 자리 지정을 해제했습니다.`
            : `${gender === 'male' ? '남학생' : '여학생'} 자리로 지정했습니다. 계속 좌석을 클릭해 여러 자리를 지정할 수 있습니다.`,
        )
      }
      return
    }

    const occupiedStudentId = studentIdAtSeat(seatId)
    if (occupiedStudentId) {
      setActiveTool({ type: 'swap', firstStudentId: occupiedStudentId })
      setMessage(
        `${studentNameById.get(occupiedStudentId) ?? '첫 번째 학생'}을 선택했습니다. 바꿀 두 번째 학생 자리를 클릭해 주세요.`,
      )
      return
    }

    if (seatEditMode) {
      const mode = seatEditMode
      setSeats((prev) =>
        prev.map((s) =>
          s.id === seatId ? { ...s, status: s.status === mode ? 'available' : mode, genderSeat: undefined } : s,
        ),
      )
    }
  }

  function generate() {
    setErrorMessage('')
    setActiveTool(null)
    if (!students.length) {
      setErrorMessage('먼저 학생 명단을 불러와 주세요.')
      return
    }
    try {
      const result = generatePlacement(
        students.map((s) => ({ id: s.id, gender: mapGender(s.gender) })),
        seats,
        { fixed, separations, avoidPairs: new Set() },
        { genderBalance, previousAssignments: new Map() },
      )
      setAssignments(result)
      setMessage('필수 조건을 지키면서 새 자리표를 만들었습니다.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '자리 배치 중 문제가 발생했습니다.')
    }
  }

  function clearPlacement() {
    setActiveTool(null)
    setAssignments(new Map())
    setMessage('현재 배치를 초기화했습니다.')
  }

  const selectedSeatId =
    activeTool?.type === 'swap' && activeTool.firstStudentId
      ? (assignments.get(activeTool.firstStudentId) ?? null)
      : null

  const conditionRows = useMemo(() => {
    const rows: { key: string; title: string; detail: string; onRemove: () => void }[] = []
    for (const [studentId, seatId] of fixed) {
      const student = studentNameById.get(studentId)
      const seat = getSeat(seatId)
      if (student && seat) {
        rows.push({
          key: `fixed-${studentId}`,
          title: `${student} · ${seat.row}행 ${seat.column}열 고정`,
          detail: '다시 섞어도 이 위치를 유지합니다.',
          onRemove: () => removeFixed(studentId),
        })
      }
    }
    for (const seat of seats) {
      if (seat.genderSeat) {
        rows.push({
          key: `gender-${seat.id}`,
          title: `${seat.genderSeat === 'male' ? '남학생' : '여학생'} · ${seat.row}행 ${seat.column}열`,
          detail: '해당 성별 학생만 배치합니다.',
          onRemove: () => removeGenderSeat(seat.id),
        })
      }
    }
    separations.forEach((item, index) => {
      const a = studentNameById.get(item.student_a)
      const b = studentNameById.get(item.student_b)
      if (a && b) {
        rows.push({
          key: `separation-${index}`,
          title: `${a} · ${b} 분리`,
          detail:
            item.type === 'diagonal'
              ? '대각선을 포함해 인접하지 않게 배치합니다.'
              : '앞뒤·좌우로 인접하지 않게 배치합니다.',
          onRemove: () => removeSeparation(index),
        })
      }
    })
    return rows
  }, [fixed, seats, separations, studentNameById])

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">학급 자리 배치</h1>
      <p className="mb-4 text-sm text-gray-600">학생 {students.length}명</p>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded border border-gray-200 p-4">
        <label className="flex flex-col gap-1 text-sm">
          행
          <input
            type="number"
            min={1}
            max={12}
            value={rowsInput}
            onChange={(e) => setRowsInput(Number(e.target.value))}
            className="w-20 rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          열
          <input
            type="number"
            min={1}
            max={12}
            value={columnsInput}
            onChange={(e) => setColumnsInput(Number(e.target.value))}
            className="w-20 rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          칠판 방향
          <select
            value={teacherDirection}
            onChange={(e) => setTeacherDirection(e.target.value as TeacherDirection)}
            className="rounded border border-gray-300 px-2 py-1"
          >
            <option value="north">위쪽</option>
            <option value="south">아래쪽</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          보기 방향
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'teacher' | 'back')}
            className="rounded border border-gray-300 px-2 py-1"
          >
            <option value="teacher">앞에서 볼 때(교사 시점)</option>
            <option value="back">뒤에서 볼 때</option>
          </select>
        </label>
        <button onClick={applyLayout} className="rounded border border-gray-300 px-3 py-2 text-sm">
          좌석 구조 적용
        </button>
        <button
          onClick={toggleSeatEditMode}
          className={`rounded border px-3 py-2 text-sm ${seatEditMode ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}
        >
          {seatEditMode === 'disabled' ? '사용 안 함 지정 중' : seatEditMode === 'empty' ? '빈자리 지정 중' : '빈자리 지정'}
        </button>
      </div>

      {errorMessage && <p className="mb-4 text-red-600">{errorMessage}</p>}

      <SeatingGrid
        seats={seats}
        columns={columns}
        teacherDirection={teacherDirection}
        viewMode={viewMode}
        assignments={assignments}
        students={students}
        fixedSeatIds={new Set(fixed.values())}
        selectedSeatId={selectedSeatId}
        onSeatClick={handleSeatClick}
      />

      <p className="mb-6 text-sm text-gray-600">{message}</p>

      <div className="mb-8 flex flex-wrap gap-2">
        <button onClick={generate} className="rounded bg-blue-600 px-3 py-2 text-sm text-white">
          자리 배치 시작
        </button>
        <button onClick={generate} className="rounded border border-gray-300 px-3 py-2 text-sm">
          재배치하기
        </button>
        <button onClick={clearPlacement} className="rounded border border-gray-300 px-3 py-2 text-sm">
          초기화
        </button>
      </div>

      <div className="mb-8 rounded border border-gray-200 p-4">
        <h2 className="mb-2 text-lg font-semibold">조건 설정</h2>
        <p className="mb-3 text-sm text-gray-600">
          버튼을 누른 뒤 자리표에서 직접 좌석을 선택하세요. 배치된 학생 두 명을 차례로 클릭하면 바로 자리가 바뀝니다.
        </p>

        <div className="mb-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            고정할 학생
            <select
              value={selectedFixedStudentId}
              onChange={(e) => setSelectedFixedStudentId(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1"
            >
              <option value="">학생 선택</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.number}. {s.name}
                </option>
              ))}
            </select>
          </label>
          <button onClick={startFixedTool} className="rounded border border-gray-300 px-3 py-2 text-sm">
            학생 자리 직접 지정
          </button>
          <button onClick={() => startGenderTool('male')} className="rounded border border-gray-300 px-3 py-2 text-sm">
            남학생 자리 지정
          </button>
          <button onClick={() => startGenderTool('female')} className="rounded border border-gray-300 px-3 py-2 text-sm">
            여학생 자리 지정
          </button>
        </div>

        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={genderBalance}
            disabled={!hasGenderInfo}
            onChange={(e) => setGenderBalance(e.target.checked)}
          />
          성별을 고려해 가능한 고르게 배치
        </label>

        <div className="mb-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            학생 A
            <select
              value={separationStudentA}
              onChange={(e) => setSeparationStudentA(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1"
            >
              <option value="">학생 선택</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.number}. {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            학생 B
            <select
              value={separationStudentB}
              onChange={(e) => setSeparationStudentB(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1"
            >
              <option value="">학생 선택</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.number}. {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            분리 수준
            <select
              value={separationType}
              onChange={(e) => setSeparationType(e.target.value as SeparationType)}
              className="rounded border border-gray-300 px-2 py-1"
            >
              <option value="orthogonal">앞뒤·좌우 인접 금지</option>
              <option value="diagonal">대각선 포함 인접 금지</option>
            </select>
          </label>
          <button onClick={addSeparation} className="rounded border border-gray-300 px-3 py-2 text-sm">
            분리 설정 추가
          </button>
        </div>

        {conditionMessage && <p className="mb-3 text-sm text-gray-600">{conditionMessage}</p>}

        <div className="flex flex-col gap-2">
          {conditionRows.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between rounded border border-gray-100 p-2 text-sm"
            >
              <div>
                <strong>{row.title}</strong>
                <p className="text-gray-500">{row.detail}</p>
              </div>
              <button onClick={row.onRemove} className="rounded border border-gray-300 px-2 py-1 text-xs">
                삭제
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build and lint**

Run: `npm run build`
Expected: succeeds with no type errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`, open the app, log in, and navigate to `http://localhost:5173/seating` directly (it isn't in the sidebar yet — that's Task 9). Confirm:
- "고정할 학생" 선택 후 "학생 자리 직접 지정" → 사용 가능한 좌석 클릭 시 그 학생이 자물쇠 아이콘과 함께 고정되고, "자리 배치 시작" 후에도 그 자리에 그대로 있는지
- "남학생 자리 지정"/"여학생 자리 지정" → 좌석 클릭 시 파란색/분홍색으로 표시되고, 자동 배치 시 반대 성별 학생이 배치되지 않는지
- 학생 A/B + 분리 수준 설정 후 자동 배치 시 두 학생이 인접하지 않는지
- 조건 목록에서 "삭제" 클릭 시 해당 조건이 사라지고 현재 배치가 초기화 확인 메시지 없이 바로 초기화되는지(조건 변경 시 자동 초기화)

- [ ] **Step 4: Commit**

```bash
git add src/routes/SeatingPage.tsx
git commit -m "feat: add fixed seats, gender-restricted seats, and separation rules to SeatingPage"
```

---

### Task 8: `SeatingPage` — save & records panel, avoid-past-neighbors

**Files:**
- Modify: `src/routes/SeatingPage.tsx` (full-file replacement of Task 7's version)

**Interfaces:**
- Consumes: everything from Task 7, plus `useSeatingPlans`/`SeatingPlanInput` from `src/lib/hooks/useSeatingPlans.ts` (Task 5), `derivePastNeighborPairs` from `src/lib/seating.ts` (Task 4), `SeatingPlan` from `src/lib/types.ts` (Task 1).
- Produces: the same `SeatingPage` export, now with title/date/record-month state, save/load/duplicate/delete, and the "지난 짝 피하기" checkbox wired into `generate()`. Extended once more in Task 9 (print + routing only — no further logic changes).

- [ ] **Step 1: Replace `src/routes/SeatingPage.tsx` with the full updated contents**

```tsx
import { useMemo, useState } from 'react'
import { useStudents } from '../lib/hooks/useStudents'
import { useSeatingPlans, type SeatingPlanInput } from '../lib/hooks/useSeatingPlans'
import { SeatingGrid } from '../components/SeatingGrid'
import { createSeats, derivePastNeighborPairs, generatePlacement, mapGender } from '../lib/seating'
import type { Seat, SeatGender, SeatingPlan, SeatSeparation, SeparationType, TeacherDirection } from '../lib/types'

type ActiveTool =
  | { type: 'swap'; firstStudentId: string | null }
  | { type: 'fixed'; studentId: string }
  | { type: 'gender'; gender: SeatGender }

function todayDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function todayYearMonth() {
  return todayDate().slice(0, 7)
}

export function SeatingPage() {
  const { students } = useStudents()

  const [rowsInput, setRowsInput] = useState(5)
  const [columnsInput, setColumnsInput] = useState(6)
  const [teacherDirection, setTeacherDirection] = useState<TeacherDirection>('north')
  const [viewMode, setViewMode] = useState<'teacher' | 'back'>('teacher')
  const [seats, setSeats] = useState<Seat[]>(() => createSeats(5, 6))
  const [assignments, setAssignments] = useState<Map<string, string>>(new Map())
  const [seatEditMode, setSeatEditMode] = useState<'empty' | 'disabled' | null>(null)
  const [activeTool, setActiveTool] = useState<ActiveTool | null>(null)
  const [message, setMessage] = useState('학생 명단을 불러온 뒤 자리 배치 시작을 눌러 주세요.')
  const [errorMessage, setErrorMessage] = useState('')

  const [fixed, setFixed] = useState<Map<string, string>>(new Map())
  const [separations, setSeparations] = useState<SeatSeparation[]>([])
  const [genderBalance, setGenderBalance] = useState(false)
  const [selectedFixedStudentId, setSelectedFixedStudentId] = useState('')
  const [separationStudentA, setSeparationStudentA] = useState('')
  const [separationStudentB, setSeparationStudentB] = useState('')
  const [separationType, setSeparationType] = useState<SeparationType>('orthogonal')
  const [conditionMessage, setConditionMessage] = useState('')

  const [manuallyMoved, setManuallyMoved] = useState<Set<string>>(new Set())
  const [previousAssignments, setPreviousAssignments] = useState<Map<string, string>>(new Map())
  const [title, setTitle] = useState('')
  const [planDate, setPlanDate] = useState(todayDate())
  const [recordMonth, setRecordMonth] = useState(todayYearMonth())
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null)
  const [avoidPastNeighbors, setAvoidPastNeighbors] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const { plans, loading: plansLoading, error: plansError, savePlan, deletePlan } = useSeatingPlans(recordMonth)

  const columns = useMemo(() => seats.reduce((max, s) => Math.max(max, s.column), 0), [seats])
  const studentGenderById = useMemo(
    () => new Map(students.map((s) => [s.id, mapGender(s.gender)])),
    [students],
  )
  const studentNameById = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students])
  const hasGenderInfo = useMemo(() => students.some((s) => mapGender(s.gender) !== 'unspecified'), [students])

  function getSeat(seatId: string): Seat | undefined {
    return seats.find((s) => s.id === seatId)
  }

  function studentIdAtSeat(seatId: string): string | null {
    for (const [studentId, assignedSeatId] of assignments) {
      if (assignedSeatId === seatId) return studentId
    }
    return null
  }

  function clearCurrentPlacement() {
    if (assignments.size) {
      setAssignments(new Map())
      setMessage('조건이 바뀌었습니다. 자리 배치 시작을 눌러 다시 만들어 주세요.')
    }
  }

  function applyLayout() {
    if (
      !Number.isInteger(rowsInput) ||
      !Number.isInteger(columnsInput) ||
      rowsInput < 1 ||
      columnsInput < 1 ||
      rowsInput > 12 ||
      columnsInput > 12
    ) {
      setErrorMessage('행과 열은 각각 1부터 12까지 입력해 주세요.')
      return
    }
    if (assignments.size && !window.confirm('좌석 구조를 바꾸면 현재 배치와 조건이 초기화됩니다. 계속할까요?')) {
      return
    }
    setSeats(createSeats(rowsInput, columnsInput))
    setAssignments(new Map())
    setFixed(new Map())
    setSeparations([])
    setActiveTool(null)
    setErrorMessage('')
    setMessage(`${rowsInput}행 ${columnsInput}열 좌석 구조를 만들었습니다.`)
  }

  function toggleSeatEditMode() {
    setActiveTool(null)
    setSeatEditMode((prev) => (prev === 'empty' ? 'disabled' : 'empty'))
  }

  function startFixedTool() {
    if (!selectedFixedStudentId) {
      setConditionMessage('먼저 고정할 학생을 선택해 주세요.')
      return
    }
    setActiveTool({ type: 'fixed', studentId: selectedFixedStudentId })
    setMessage(
      `${studentNameById.get(selectedFixedStudentId) ?? '선택한 학생'}의 자리를 자리표에서 직접 클릭해 주세요.`,
    )
  }

  function startGenderTool(gender: SeatGender) {
    if (!students.some((s) => mapGender(s.gender) === gender)) {
      setConditionMessage(`명단에 ${gender === 'male' ? '남학생' : '여학생'} 정보가 없습니다.`)
      return
    }
    setActiveTool({ type: 'gender', gender })
    setMessage(
      `${gender === 'male' ? '남학생' : '여학생'} 전용으로 할 자리를 직접 클릭해 주세요. 같은 자리를 다시 누르면 해제됩니다.`,
    )
  }

  function addSeparation() {
    if (!separationStudentA || !separationStudentB || separationStudentA === separationStudentB) {
      setConditionMessage('서로 다른 두 학생을 선택해 주세요.')
      return
    }
    const duplicate = separations.some(
      (item) =>
        (item.student_a === separationStudentA && item.student_b === separationStudentB) ||
        (item.student_a === separationStudentB && item.student_b === separationStudentA),
    )
    if (duplicate) {
      setConditionMessage('이미 설정된 분리 조건입니다.')
      return
    }
    setSeparations((prev) => [
      ...prev,
      { student_a: separationStudentA, student_b: separationStudentB, type: separationType },
    ])
    setConditionMessage('분리 설정을 추가했습니다.')
  }

  function removeFixed(studentId: string) {
    setFixed((prev) => {
      const next = new Map(prev)
      next.delete(studentId)
      return next
    })
    clearCurrentPlacement()
  }

  function removeGenderSeat(seatId: string) {
    setSeats((prev) => prev.map((s) => (s.id === seatId ? { ...s, genderSeat: undefined } : s)))
    clearCurrentPlacement()
  }

  function removeSeparation(index: number) {
    setSeparations((prev) => prev.filter((_, i) => i !== index))
    clearCurrentPlacement()
  }

  function handleSeatClick(seatId: string) {
    const seat = getSeat(seatId)
    if (!seat) return

    if (activeTool?.type === 'swap') {
      const studentId = studentIdAtSeat(seatId)
      if (!studentId) {
        setMessage('학생이 배치된 자리만 선택할 수 있습니다.')
        return
      }
      if (!activeTool.firstStudentId) {
        setActiveTool({ type: 'swap', firstStudentId: studentId })
        setMessage(
          `${studentNameById.get(studentId) ?? '첫 번째 학생'}을 선택했습니다. 바꿀 두 번째 학생 자리를 클릭해 주세요.`,
        )
        return
      }
      if (activeTool.firstStudentId === studentId) {
        setMessage('서로 다른 두 학생을 선택해 주세요.')
        return
      }
      const firstId = activeTool.firstStudentId
      if (fixed.has(firstId) || fixed.has(studentId)) {
        setMessage('고정된 학생의 자리는 맞바꾸기할 수 없습니다.')
        setActiveTool(null)
        return
      }
      const firstSeatId = assignments.get(firstId)!
      const secondSeatId = assignments.get(studentId)!
      const firstSeat = getSeat(firstSeatId)!
      const secondSeat = getSeat(secondSeatId)!
      const firstGender = studentGenderById.get(firstId) ?? 'unspecified'
      const secondGender = studentGenderById.get(studentId) ?? 'unspecified'
      const firstCanUseSecond = !secondSeat.genderSeat || firstGender === secondSeat.genderSeat
      const secondCanUseFirst = !firstSeat.genderSeat || secondGender === firstSeat.genderSeat
      if (!firstCanUseSecond || !secondCanUseFirst) {
        setMessage('성별 지정 좌석 조건과 맞지 않아 자리를 바꿀 수 없습니다.')
        setActiveTool(null)
        return
      }
      setAssignments((prev) => {
        const next = new Map(prev)
        next.set(firstId, secondSeatId)
        next.set(studentId, firstSeatId)
        return next
      })
      setManuallyMoved((prev) => new Set(prev).add(firstId).add(studentId))
      setActiveTool(null)
      setMessage(
        `${studentNameById.get(firstId) ?? ''}과(와) ${studentNameById.get(studentId) ?? ''}의 자리를 맞바꿨습니다.`,
      )
      return
    }

    if (activeTool?.type === 'fixed' || activeTool?.type === 'gender') {
      if (seat.status !== 'available') {
        setConditionMessage('사용 가능한 좌석만 지정할 수 있습니다.')
        return
      }
      if (activeTool.type === 'fixed') {
        const studentId = activeTool.studentId
        const conflictingStudentId = [...fixed.entries()].find(
          ([sid, assignedSeatId]) => assignedSeatId === seatId && sid !== studentId,
        )?.[0]
        if (conflictingStudentId) {
          setConditionMessage('이미 다른 학생이 고정된 좌석입니다.')
          return
        }
        clearCurrentPlacement()
        setFixed((prev) => new Map(prev).set(studentId, seatId))
        setActiveTool(null)
        setConditionMessage('학생 고정 자리를 지정했습니다.')
      } else {
        clearCurrentPlacement()
        const gender = activeTool.gender
        const isSameGender = seat.genderSeat === gender
        setSeats((prev) =>
          prev.map((s) => (s.id === seatId ? { ...s, genderSeat: isSameGender ? undefined : gender } : s)),
        )
        setConditionMessage(
          isSameGender
            ? `${gender === 'male' ? '남학생' : '여학생'} 자리 지정을 해제했습니다.`
            : `${gender === 'male' ? '남학생' : '여학생'} 자리로 지정했습니다. 계속 좌석을 클릭해 여러 자리를 지정할 수 있습니다.`,
        )
      }
      return
    }

    const occupiedStudentId = studentIdAtSeat(seatId)
    if (occupiedStudentId) {
      setActiveTool({ type: 'swap', firstStudentId: occupiedStudentId })
      setMessage(
        `${studentNameById.get(occupiedStudentId) ?? '첫 번째 학생'}을 선택했습니다. 바꿀 두 번째 학생 자리를 클릭해 주세요.`,
      )
      return
    }

    if (seatEditMode) {
      const mode = seatEditMode
      setSeats((prev) =>
        prev.map((s) =>
          s.id === seatId ? { ...s, status: s.status === mode ? 'available' : mode, genderSeat: undefined } : s,
        ),
      )
    }
  }

  function generate() {
    setErrorMessage('')
    setActiveTool(null)
    if (!students.length) {
      setErrorMessage('먼저 학생 명단을 불러와 주세요.')
      return
    }
    try {
      const avoidPairs = avoidPastNeighbors ? derivePastNeighborPairs(plans) : new Set<string>()
      const result = generatePlacement(
        students.map((s) => ({ id: s.id, gender: mapGender(s.gender) })),
        seats,
        { fixed, separations, avoidPairs },
        { genderBalance, previousAssignments },
      )
      setAssignments(result)
      setManuallyMoved(new Set())
      setMessage(
        avoidPastNeighbors
          ? `기록 월의 지난 짝 ${avoidPairs.size}쌍을 피하면서 새 자리표를 만들었습니다.`
          : '필수 조건을 지키면서 새 자리표를 만들었습니다.',
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '자리 배치 중 문제가 발생했습니다.')
    }
  }

  function clearPlacement() {
    setActiveTool(null)
    setAssignments(new Map())
    setMessage('현재 배치를 초기화했습니다.')
  }

  function buildPayload(): SeatingPlanInput {
    return {
      title,
      plan_date: planDate,
      rows: seats.reduce((max, s) => Math.max(max, s.row), 0),
      columns,
      teacher_direction: teacherDirection,
      seats,
      assignments: [...assignments.entries()].map(([student_id, seat_id]) => ({
        student_id,
        seat_id,
        is_fixed: fixed.get(student_id) === seat_id,
        source: manuallyMoved.has(student_id) ? 'manual' : 'automatic',
      })),
      separations,
      gender_balance: genderBalance,
      avoid_past_neighbors: avoidPastNeighbors,
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      setSaveMessage('자리표 제목을 입력해 주세요.')
      return
    }
    if (!assignments.size) {
      setSaveMessage('학생 명단을 불러와 자리 배치한 뒤 저장해 주세요.')
      return
    }
    const result = await savePlan(savedPlanId, buildPayload())
    if (result.error) {
      setSaveMessage(result.error)
      return
    }
    if (result.data) {
      setSavedPlanId(result.data.id)
    }
    setSaveMessage('현재 자리표를 저장했습니다.')
  }

  function handleLoad(plan: SeatingPlan, duplicate = false) {
    setSeats(plan.seats)
    setAssignments(new Map(plan.assignments.map((a) => [a.student_id, a.seat_id])))
    setFixed(new Map(plan.assignments.filter((a) => a.is_fixed).map((a) => [a.student_id, a.seat_id])))
    setManuallyMoved(new Set(plan.assignments.filter((a) => a.source === 'manual').map((a) => a.student_id)))
    setSeparations(plan.separations)
    setTeacherDirection(plan.teacher_direction)
    setGenderBalance(plan.gender_balance)
    setAvoidPastNeighbors(plan.avoid_past_neighbors)
    setRowsInput(plan.rows)
    setColumnsInput(plan.columns)
    setPreviousAssignments(new Map(plan.assignments.map((a) => [a.student_id, a.seat_id])))
    setActiveTool(null)
    setTitle(duplicate ? `${plan.title} 복제` : plan.title)
    setPlanDate(duplicate ? todayDate() : plan.plan_date)
    setSavedPlanId(duplicate ? null : plan.id)
    setSaveMessage(
      duplicate ? '자리표를 복제했습니다. 제목이나 조건을 수정한 뒤 새로 저장하세요.' : '저장된 자리표를 불러왔습니다.',
    )
  }

  async function handleDelete(id: string) {
    if (!window.confirm('이 자리표를 삭제할까요? 삭제한 기록은 되돌릴 수 없습니다.')) return
    const result = await deletePlan(id)
    if (result.error) {
      setSaveMessage(result.error)
      return
    }
    if (savedPlanId === id) setSavedPlanId(null)
    setSaveMessage('자리표를 삭제했습니다.')
  }

  const selectedSeatId =
    activeTool?.type === 'swap' && activeTool.firstStudentId
      ? (assignments.get(activeTool.firstStudentId) ?? null)
      : null

  const conditionRows = useMemo(() => {
    const rows: { key: string; title: string; detail: string; onRemove: () => void }[] = []
    for (const [studentId, seatId] of fixed) {
      const student = studentNameById.get(studentId)
      const seat = getSeat(seatId)
      if (student && seat) {
        rows.push({
          key: `fixed-${studentId}`,
          title: `${student} · ${seat.row}행 ${seat.column}열 고정`,
          detail: '다시 섞어도 이 위치를 유지합니다.',
          onRemove: () => removeFixed(studentId),
        })
      }
    }
    for (const seat of seats) {
      if (seat.genderSeat) {
        rows.push({
          key: `gender-${seat.id}`,
          title: `${seat.genderSeat === 'male' ? '남학생' : '여학생'} · ${seat.row}행 ${seat.column}열`,
          detail: '해당 성별 학생만 배치합니다.',
          onRemove: () => removeGenderSeat(seat.id),
        })
      }
    }
    separations.forEach((item, index) => {
      const a = studentNameById.get(item.student_a)
      const b = studentNameById.get(item.student_b)
      if (a && b) {
        rows.push({
          key: `separation-${index}`,
          title: `${a} · ${b} 분리`,
          detail:
            item.type === 'diagonal'
              ? '대각선을 포함해 인접하지 않게 배치합니다.'
              : '앞뒤·좌우로 인접하지 않게 배치합니다.',
          onRemove: () => removeSeparation(index),
        })
      }
    })
    return rows
  }, [fixed, seats, separations, studentNameById])

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">학급 자리 배치</h1>
      <p className="mb-4 text-sm text-gray-600">학생 {students.length}명</p>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded border border-gray-200 p-4">
        <label className="flex flex-col gap-1 text-sm">
          행
          <input
            type="number"
            min={1}
            max={12}
            value={rowsInput}
            onChange={(e) => setRowsInput(Number(e.target.value))}
            className="w-20 rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          열
          <input
            type="number"
            min={1}
            max={12}
            value={columnsInput}
            onChange={(e) => setColumnsInput(Number(e.target.value))}
            className="w-20 rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          칠판 방향
          <select
            value={teacherDirection}
            onChange={(e) => setTeacherDirection(e.target.value as TeacherDirection)}
            className="rounded border border-gray-300 px-2 py-1"
          >
            <option value="north">위쪽</option>
            <option value="south">아래쪽</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          보기 방향
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'teacher' | 'back')}
            className="rounded border border-gray-300 px-2 py-1"
          >
            <option value="teacher">앞에서 볼 때(교사 시점)</option>
            <option value="back">뒤에서 볼 때</option>
          </select>
        </label>
        <button onClick={applyLayout} className="rounded border border-gray-300 px-3 py-2 text-sm">
          좌석 구조 적용
        </button>
        <button
          onClick={toggleSeatEditMode}
          className={`rounded border px-3 py-2 text-sm ${seatEditMode ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}
        >
          {seatEditMode === 'disabled' ? '사용 안 함 지정 중' : seatEditMode === 'empty' ? '빈자리 지정 중' : '빈자리 지정'}
        </button>
      </div>

      {errorMessage && <p className="mb-4 text-red-600">{errorMessage}</p>}

      <SeatingGrid
        seats={seats}
        columns={columns}
        teacherDirection={teacherDirection}
        viewMode={viewMode}
        assignments={assignments}
        students={students}
        fixedSeatIds={new Set(fixed.values())}
        selectedSeatId={selectedSeatId}
        onSeatClick={handleSeatClick}
      />

      <p className="mb-6 text-sm text-gray-600">{message}</p>

      <div className="mb-8 flex flex-wrap gap-2">
        <button onClick={generate} className="rounded bg-blue-600 px-3 py-2 text-sm text-white">
          자리 배치 시작
        </button>
        <button onClick={generate} className="rounded border border-gray-300 px-3 py-2 text-sm">
          재배치하기
        </button>
        <button onClick={clearPlacement} className="rounded border border-gray-300 px-3 py-2 text-sm">
          초기화
        </button>
      </div>

      <div className="mb-8 rounded border border-gray-200 p-4">
        <h2 className="mb-2 text-lg font-semibold">조건 설정</h2>
        <p className="mb-3 text-sm text-gray-600">
          버튼을 누른 뒤 자리표에서 직접 좌석을 선택하세요. 배치된 학생 두 명을 차례로 클릭하면 바로 자리가 바뀝니다.
        </p>

        <div className="mb-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            고정할 학생
            <select
              value={selectedFixedStudentId}
              onChange={(e) => setSelectedFixedStudentId(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1"
            >
              <option value="">학생 선택</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.number}. {s.name}
                </option>
              ))}
            </select>
          </label>
          <button onClick={startFixedTool} className="rounded border border-gray-300 px-3 py-2 text-sm">
            학생 자리 직접 지정
          </button>
          <button onClick={() => startGenderTool('male')} className="rounded border border-gray-300 px-3 py-2 text-sm">
            남학생 자리 지정
          </button>
          <button onClick={() => startGenderTool('female')} className="rounded border border-gray-300 px-3 py-2 text-sm">
            여학생 자리 지정
          </button>
        </div>

        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={genderBalance}
            disabled={!hasGenderInfo}
            onChange={(e) => setGenderBalance(e.target.checked)}
          />
          성별을 고려해 가능한 고르게 배치
        </label>

        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={avoidPastNeighbors}
            onChange={(e) => setAvoidPastNeighbors(e.target.checked)}
          />
          지난 짝 피하기 (아래 기록 월에 저장된 자리표 기준)
        </label>

        <div className="mb-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            학생 A
            <select
              value={separationStudentA}
              onChange={(e) => setSeparationStudentA(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1"
            >
              <option value="">학생 선택</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.number}. {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            학생 B
            <select
              value={separationStudentB}
              onChange={(e) => setSeparationStudentB(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1"
            >
              <option value="">학생 선택</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.number}. {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            분리 수준
            <select
              value={separationType}
              onChange={(e) => setSeparationType(e.target.value as SeparationType)}
              className="rounded border border-gray-300 px-2 py-1"
            >
              <option value="orthogonal">앞뒤·좌우 인접 금지</option>
              <option value="diagonal">대각선 포함 인접 금지</option>
            </select>
          </label>
          <button onClick={addSeparation} className="rounded border border-gray-300 px-3 py-2 text-sm">
            분리 설정 추가
          </button>
        </div>

        {conditionMessage && <p className="mb-3 text-sm text-gray-600">{conditionMessage}</p>}

        <div className="flex flex-col gap-2">
          {conditionRows.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between rounded border border-gray-100 p-2 text-sm"
            >
              <div>
                <strong>{row.title}</strong>
                <p className="text-gray-500">{row.detail}</p>
              </div>
              <button onClick={row.onRemove} className="rounded border border-gray-300 px-2 py-1 text-xs">
                삭제
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8 rounded border border-gray-200 p-4">
        <h2 className="mb-2 text-lg font-semibold">저장 & 기록</h2>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            제목
            <input
              type="text"
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 2026년 8월 1차 자리표"
              className="rounded border border-gray-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            날짜
            <input
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            기록 월
            <input
              type="month"
              value={recordMonth}
              onChange={(e) => setRecordMonth(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1"
            />
          </label>
          <button onClick={handleSave} className="rounded bg-blue-600 px-3 py-2 text-sm text-white">
            현재 자리표 저장
          </button>
        </div>

        {saveMessage && <p className="mb-3 text-sm text-gray-600">{saveMessage}</p>}
        {plansError && <p className="mb-3 text-red-600">{plansError}</p>}

        <h3 className="mb-2 text-sm font-semibold">자리바꾸기 목록</h3>
        {plansLoading && <p className="text-sm text-gray-500">불러오는 중...</p>}
        {!plansLoading && plans.length === 0 && (
          <p className="text-sm text-gray-500">선택한 달에 저장된 자리표가 없습니다.</p>
        )}
        <ul className="flex flex-col gap-2">
          {plans.map((plan) => (
            <li key={plan.id} className="flex items-center justify-between rounded border border-gray-100 p-2 text-sm">
              <div>
                <p className="font-medium">{plan.title}</p>
                <p className="text-gray-500">{plan.plan_date}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleLoad(plan)} className="rounded border border-gray-300 px-2 py-1 text-xs">
                  불러오기
                </button>
                <button
                  onClick={() => handleLoad(plan, true)}
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                >
                  복제
                </button>
                <button
                  onClick={() => handleDelete(plan.id)}
                  className="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build and lint**

Run: `npm run build`
Expected: succeeds with no type errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

With the dev server running and logged in, at `http://localhost:5173/seating`:
- 배치 후 제목 입력 → 저장 → "자리바꾸기 목록"에 나타나는지
- 다른 배치로 바꾼 뒤 방금 저장한 항목 "불러오기" → 원래 배치가 정확히 복원되는지(고정/성별지정/분리규칙 포함)
- "복제" → 새 제목("... 복제")으로 폼이 채워지고, 저장하면 원본과 별개의 새 항목이 생기는지
- "삭제" → 확인창 → 목록에서 사라지는지
- "지난 짝 피하기" 체크 후 재배치 → 같은 기록 월에 저장된 이전 자리표의 좌우 짝이 이번엔 다르게 배치되는지(짝 후보가 여유 있는 배치에서 확인)
- 기록 월 입력을 바꾸면 그 달에 저장된 자리표만 목록에 나타나는지

- [ ] **Step 4: Commit**

```bash
git add src/routes/SeatingPage.tsx
git commit -m "feat: add save/load/duplicate/delete and avoid-past-neighbors to SeatingPage"
```

---

### Task 9: Print support, sidebar navigation, routing, final smoke test

**Files:**
- Modify: `src/routes/SeatingPage.tsx:125-135` (top of the returned JSX) and the panel wrapper `className`s
- Modify: `src/components/AppShell.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `SeatingPage` (Task 8), existing `AppShell`/`App.tsx` structure.
- Produces: `/seating` reachable from the sidebar, printable seat grid.

- [ ] **Step 1: Add print-only visibility to `SeatingPage.tsx`**

In `src/routes/SeatingPage.tsx`, make these targeted edits to the JSX returned at the end of the component (the file otherwise stays exactly as Task 8 left it):

Replace the opening of the return block —

```tsx
  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">학급 자리 배치</h1>
      <p className="mb-4 text-sm text-gray-600">학생 {students.length}명</p>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded border border-gray-200 p-4">
```

with —

```tsx
  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">학급 자리 배치</h1>
          <p className="text-sm text-gray-600">학생 {students.length}명</p>
        </div>
        <button onClick={() => window.print()} className="rounded border border-gray-300 px-3 py-2 text-sm">
          인쇄
        </button>
      </div>

      <p className="mb-4 hidden text-lg font-semibold print:block">
        {title || '자리표'} · {planDate}
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded border border-gray-200 p-4 print:hidden">
```

Then add `print:hidden` to the `className` of every other top-level block between the layout-config `<div>` and the closing `</div>` of the page **except** the `<SeatingGrid ... />` element itself (which must remain visible when printing). Specifically, change these existing `className` values:

- The `{errorMessage && <p className="mb-4 text-red-600">{errorMessage}</p>}` line → `className="mb-4 text-red-600 print:hidden"`
- The `<p className="mb-6 text-sm text-gray-600">{message}</p>` line (status message under the grid) → `className="mb-6 text-sm text-gray-600 print:hidden"`
- The `<div className="mb-8 flex flex-wrap gap-2">` wrapping the 자리 배치 시작/재배치하기/초기화 buttons → `className="mb-8 flex flex-wrap gap-2 print:hidden"`
- The `<div className="mb-8 rounded border border-gray-200 p-4">` wrapping "조건 설정" → `className="mb-8 rounded border border-gray-200 p-4 print:hidden"`
- The `<div className="mb-8 rounded border border-gray-200 p-4">` wrapping "저장 & 기록" → `className="mb-8 rounded border border-gray-200 p-4 print:hidden"`

- [ ] **Step 2: Add the sidebar link and print-hide the sidebar in `AppShell.tsx`**

In `src/components/AppShell.tsx`, add a new `NavLink` right after the "출결관리" link and before the `<div className="flex-1" />` spacer:

```tsx
<NavLink to="/attendance" className={({ isActive }) => linkClass(isActive)}>
  출결관리
</NavLink>
<NavLink to="/seating" className={({ isActive }) => linkClass(isActive)}>
  학급 자리 배치
</NavLink>
<div className="flex-1" />
```

Add `print:hidden` to the `<nav>` element's `className` so the sidebar disappears when printing from any page (not just `/seating`):

```tsx
<nav className="flex w-48 flex-col gap-1 border-r border-gray-200 p-4 print:hidden">
```

- [ ] **Step 3: Wire the `/seating` route in `App.tsx`**

In `src/App.tsx`, add the import next to the other route imports:

```tsx
import { SeatingPage } from './routes/SeatingPage'
```

Add the route inside the `AppShell` layout route, after `/attendance`:

```tsx
<Route path="/attendance" element={<AttendancePage />} />
<Route path="/seating" element={<SeatingPage />} />
```

- [ ] **Step 4: Verify build and lint**

Run: `npm run build`
Expected: succeeds with no type errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Full manual smoke test**

Run: `npm run dev`, open the app, log in, and confirm the complete feature end to end:

- 사이드바에 "학급 자리 배치"가 "출결관리" 바로 아래 나타나고, 클릭 시 `/seating`으로 이동하는지
- 행/열 변경 후 "좌석 구조 적용" → 격자가 다시 그려지고, 배치가 있던 상태에서는 확인창이 뜨는지
- 칠판 방향(위쪽/아래쪽), 보기 방향(교사 시점/뒤에서 볼 때) 전환 시 칠판 위치와 좌석 행/열 배치가 올바르게 뒤집히는지
- "빈자리 지정"/"사용 안 함 지정" 토글로 좌석을 빈자리·사용 안 함으로 바꿀 수 있고, 학생이 배치되지 않는지
- 학생 수가 사용 가능 좌석 수보다 많을 때 "자리 배치 시작"이 에러 메시지를 보여주고 배치하지 않는지
- 고정 좌석 학생이 "재배치하기" 후에도 그대로인지
- 성별 지정 좌석에 반대 성별 학생이 배치되지 않는지
- 분리 규칙을 건 두 학생이 인접(대각선 포함 여부는 설정대로)하지 않는지
- 배치된 학생 두 명을 순서대로 클릭하면 자리가 맞바뀌고, 고정된 학생이거나 성별 지정 좌석과 맞지 않으면 거부 메시지가 뜨는지
- 저장 → 목록에 나타남 → 다른 배치로 바꾼 뒤 불러오기 → 원래 배치·조건이 정확히 복원되는지
- 복제 → 새 자리표로 저장되고 원본은 그대로인지
- 삭제 → 확인창 → 목록에서 사라지는지
- "지난 짝 피하기" 체크 시 같은 기록 월에 저장된 자리표의 좌우 짝이 이번 배치에서 피해지는지
- 인쇄 버튼 클릭 시 인쇄 미리보기에 좌석 격자와 제목·날짜만 보이고, 사이드바·설정 패널·버튼은 보이지 않는지
- `npm test`가 전체(기존 테스트 포함) 통과하는지

- [ ] **Step 6: Commit**

```bash
git add src/routes/SeatingPage.tsx src/components/AppShell.tsx src/App.tsx
git commit -m "feat: add print support, sidebar navigation, and routing for classroom seating"
```

