# Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the five defects found in the production and code audit without changing teacher data.

**Architecture:** Vercel serves the Vite SPA through a catch-all rewrite so React Router owns client routes. The administrator modal owns all close-state cleanup in one function. A versioned, idempotent SQL migration mirrors the administrator RPC definitions already present in the schema baseline.

**Tech Stack:** React 19, TypeScript, Vite, React Router 7, Supabase PostgreSQL, Vercel, Vitest, Testing Library.

## Global Constraints

- Login accounts in `auth.users` must never be deleted by administrator reset.
- Only `dosung83@gmail.com` can call administrator RPCs.
- Do not print or commit environment-variable secrets.
- Use `npm.cmd` for PowerShell commands.

---

### Task 1: Prevent confirmation carry-over and show an empty administrator state

**Files:**
- Create: `src/routes/AdminPage.test.tsx`
- Modify: `src/routes/AdminPage.tsx`

**Interfaces:**
- Consumes: `useAuth`, `useAdminAccounts`, and `ManagedAccount`.
- Produces: a modal close path that clears `target`, `confirmation`, and `actionError` when not pending.

- [x] **Step 1: Write failing UI tests**

Test that entering `초기화`, cancelling account A, and opening account B leaves the destructive button disabled. Test that an empty account list displays `초기화할 계정이 없습니다.`.

- [x] **Step 2: Run the new route test and verify it fails**

Run: `npm.cmd test -- src/routes/AdminPage.test.tsx`

Expected: the second account reset button is enabled and the empty-state text is absent.

- [x] **Step 3: Implement the smallest route change**

Extract `closeModal()` which clears all modal state when `pending` is false; use it for both the modal close control and Cancel button. Render the empty-state paragraph when `accounts.length === 0`.

- [x] **Step 4: Run the route test and verify it passes**

Run: `npm.cmd test -- src/routes/AdminPage.test.tsx`

Expected: PASS.

### Task 2: Make Vercel route requests reach the SPA

**Files:**
- Create: `vercel.json`

**Interfaces:**
- Consumes: Vercel static deployment routing.
- Produces: a `/(.*)` rewrite to `/` for browser history routes.

- [x] **Step 1: Add the Vercel SPA rewrite configuration**

Create `vercel.json` with `{"rewrites":[{"source":"/(.*)","destination":"/"}]}`. Vercel serves `/api/*` functions before rewrites, so the existing NEIS function remains reachable.

- [ ] **Step 2: Verify production behavior after deployment**

Fetch `/home`, `/login`, and `/admin`; each must return the Vite HTML shell rather than a 404.

### Task 3: Version the administrator database migration

**Files:**
- Create: `supabase/migrations/20260818_admin_account_data_reset.sql`
- Modify: `README.md`

**Interfaces:**
- Consumes: the five existing `public` teacher-data tables and `auth.users`.
- Produces: idempotent `is_classlog_admin`, `list_managed_accounts`, and `reset_managed_account` functions with grants and revocations.

- [x] **Step 1: Add an idempotent migration**

Copy the administrator function definitions from `supabase/schema.sql` into a numbered migration using `create or replace function`, `revoke all`, and grants. Do not issue any `delete` statement outside the reset function body.

- [x] **Step 2: Document migration execution**

Add the migration command/order to README so existing Supabase projects apply new changes without re-running the non-idempotent schema baseline.

- [x] **Step 3: Verify the migration is applied to the connected production database**

Confirm the functions exist and a non-administrator cannot list accounts; do not call reset against user data.

### Task 4: Remove lint warnings

**Files:**
- Modify: `src/routes/SeatingPage.tsx`
- Modify: `src/lib/hooks/useSeatingPlans.test.ts`
- Modify: `src/lib/hooks/useSchoolSettings.test.ts`

**Interfaces:**
- Consumes: existing seating helpers and data fixture shapes.
- Produces: dependency-complete memoization and fixtures that omit unused fields without destructuring warnings.

- [x] **Step 1: Correct the condition row memo dependencies**

Include the helper functions used inside `conditionRows` in its dependency list, or make their identities stable with `useCallback` if required by the existing logic.

- [x] **Step 2: Replace unused test destructuring**

Create input objects through explicit `Omit` fields rather than destructuring unused properties.

- [x] **Step 3: Run lint**

Run: `npm.cmd run lint`

Expected: exit 0 with no warnings.

### Task 5: Full verification and delivery

**Files:**
- Verify: modified files and production deployment.

- [x] **Step 1: Run `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`, and `git diff --check`**
- [x] **Step 2: Inspect the diff and confirm only the planned files changed**
- [ ] **Step 3: Fetch direct production routes after the hosting deployment completes**
