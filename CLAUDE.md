# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Classlog (학급 대시보드) — a Korean-language classroom management dashboard. A teacher logs in, manages a student roster, and keeps per-student life/counseling records. Current scope: teacher login, student roster CRUD (including CSV bulk import), and per-student records with a fixed category filter. See `README.md` for the current feature scope and `docs/superpowers/specs/` for the design docs behind each feature slice.

## Commands

```bash
npm run dev              # start the Vite dev server
npm run build             # tsc -b (typecheck) && vite build
npm run lint               # oxlint
npm test                    # vitest run (all tests)
npm test -- <pattern>       # run only test files matching <pattern>, e.g. `npm test -- csv`
npm run preview             # preview the production build
```

There is no `test:watch` script; use `npx vitest` directly for watch mode.

### Supabase setup (required before the app can run)

1. Run `supabase/schema.sql` in the target Supabase project's SQL editor (idempotent for tables via `create table if not exists`, but re-running the `create policy` statements will error if the policies already exist — drop them first on a re-apply).
2. Create a teacher user under Authentication → Users in the Supabase dashboard (no self-service signup UI exists).
3. Copy `.env.example` to `.env` and fill `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from the project's API settings.

## Architecture

**Stack:** React 19 + TypeScript, Vite, React Router 7, Supabase (`@supabase/supabase-js` v2), Tailwind CSS v4 (via `@tailwindcss/vite`, no `tailwind.config`/PostCSS file — configured entirely through the Vite plugin and a single `@import "tailwindcss";` in `src/index.css`). Tests run on Vitest + jsdom + Testing Library.

**Data access is hook-only.** `supabase` (from `src/lib/supabaseClient.ts`) is imported only inside `src/lib/hooks/*.ts`. Components and route files never call Supabase directly — they consume `useAuth`, `useStudents`, or `useStudentRecords`. Preserve this boundary when adding features.

**Routing (`src/App.tsx`):** `/login` is public. `/students` and `/students/:id` are nested under a single path-less `<Route element={<ProtectedRoute />}>` so `ProtectedRoute`'s `useAuth()` call stays mounted across navigation between them (a layout route via `<Outlet />`, not a wrapper-per-route — an earlier per-route-wrapper version caused a loading flash on every navigation, not just after login). Any unmatched path redirects to `/students`.

**Hooks (`src/lib/hooks/`):**
- `useAuth` — wraps `supabase.auth` (session state via `getSession()`/`onAuthStateChange`, `signIn`, `signOut`). Unlike the other two hooks it doesn't expose an `error` field; callers handle their own error state (see `LoginPage`).
- `useStudents` — fetches/creates/updates/deletes rows in `students`, plus a bulk `addStudents(rows)` that does one `insert([...])` request for N rows (not a loop) and merges+re-sorts local state by `number`. All mutators return `{data|inserted, error}` and also set the hook's shared `error` state.
- `useStudentRecords(studentId)` — same CRUD shape, scoped to one student's `records`, sorted newest-`record_date`-first (ties broken by `created_at`).

**CSV import (`src/lib/csv.ts`):** a dependency-free, pure module (no React/Supabase imports) — hand-written parser rather than a library, since the student-roster format is a fixed 5-column CSV with low embedded-comma risk. `decodeCsvBytes` tries strict UTF-8 first and falls back to EUC-KR/CP949 (common for Excel exports on Korean locales) if the bytes aren't valid UTF-8. `parseStudentsCsv` detects an optional header row, validates each row, and reports both `valid` rows and `skipped` rows (each with a Korean-language reason: missing name, non-numeric 출석번호, duplicate against the existing roster, duplicate within the file, or stripped-as-header) — nothing is ever silently dropped without a reason. `ImportStudentsPanel` is the only consumer, driving a preview-before-commit UI.

**Data model (`supabase/schema.sql`, mirrored in `src/lib/types.ts`):** two tables, `students` and `records` (FK'd to `students` with `on delete cascade`), both with `teacher_id` scoping and RLS. The `students` policy checks `teacher_id = auth.uid()`; the `records` policy additionally verifies the referenced `student_id` actually belongs to the same teacher (`exists (select 1 from students s where s.id = student_id and s.teacher_id = auth.uid())`) — a bulk-insert path can't smuggle a row onto another teacher's student. `records.category` is a closed set enforced identically in two places: the Postgres `check` constraint and the `RecordCategory` TypeScript union in `src/lib/types.ts` (`생활지도 | 학습 | 진로 | 학부모상담 | 기타`) — keep both in sync if this set ever changes.

**No app-level strict TypeScript.** None of the `tsconfig*.json` files set `"strict"`, so `strictNullChecks` is off — code that passes a `string | null` where a plain `string` is expected (or similar) will compile without complaint. This has bitten real code before (a `StudentForm`/`StudentDetailPage` mismatch caught only at `npm run build` during review); don't assume the compiler will catch nullability mistakes.

## Testing conventions

Automated tests exist only for pure logic and hooks — `src/lib/csv.ts`, `src/lib/hooks/useStudents.ts`, `src/lib/hooks/useStudentRecords.ts`. There are no component or route tests (`src/components/`, `src/routes/`); those are verified by `npm run build` + `npm run lint` + manual smoke testing. Follow this split for new code rather than adding component tests.

Hook tests mock the Supabase client via `vi.mock('../supabaseClient', ...)` and the shared `createQueryBuilder` helper in `src/test/supabaseMock.ts`, which fakes the chainable query builder (`select`/`order`/`eq`/`insert`/`update`/`delete` all return the same builder; `.single()` and awaiting the builder directly both resolve to the configured `{data, error}`). **Any variable referenced inside a `vi.mock(...)` factory must be named starting with `mock` (e.g. `mockFrom`, `mockGetUser`)** — Vitest's mock-hoisting only exempts identifiers with that prefix; anything else throws `Cannot access before initialization` at runtime despite type-checking fine.

When writing a test that asserts ordering/sorting behavior, make sure the fixture data would produce a *different* result under the naive (unsorted) implementation than under the correct one — a fixture that's already in sorted order will pass even if the sort logic is broken or missing. This exact bug has occurred twice in this codebase's history and was caught only in review.

## Project docs

`docs/superpowers/specs/` holds one design doc per feature slice (written before implementation, describing scope and architecture decisions). `docs/superpowers/plans/` holds the corresponding step-by-step implementation plan for each spec. Check these before making significant changes to understand why something is scoped the way it is — several out-of-scope items (attendance, announcements, grades, seating charts, multi-year class switching, student/parent-facing views) are deliberate deferrals, not oversights.
