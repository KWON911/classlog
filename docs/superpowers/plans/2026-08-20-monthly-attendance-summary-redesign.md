---
render_with_liquid: false
---

# 출결관리 월간요약 UI 재설계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/attendance` 페이지의 "월간 요약" 탭을 촘촘한 표 형태에서, 상단 학급 전체 통계 카드 + 여백 있는 카드형 학생 리스트로 재설계한다.

**Architecture:** 데이터 흐름과 상태 관리(필터, 펼침 상태, 삭제 확인 모달)는 전혀 바꾸지 않는다. `MonthlyAttendanceSummary.tsx`의 마크업/스타일 계층만 재작성하고, 색상 매핑 파일에 0건용 회색 뱃지 상수를 하나 추가한다.

**Tech Stack:** React 19 + TypeScript, Tailwind CSS v4, lucide-react 아이콘. 참고 스펙: [`docs/superpowers/specs/2026-08-20-monthly-attendance-summary-redesign-design.md`](../specs/2026-08-20-monthly-attendance-summary-redesign-design.md)

## Global Constraints

- 새 데이터 페칭/훅 변경 없음 — `useAttendance(yearMonth)`가 반환하는 `entries`/`students`만 사용
- `filterMode`, `expandedStudentIds`, `deleteTarget`, `deletingId`, `message`/`messageIsError` 상태와 `deleteEntry` 호출 흐름은 기존과 동일하게 유지
- 상태별 색상은 `src/lib/utils/attendanceStatusColors.ts`의 `ATTENDANCE_STATUS_COLOR_CLASS`를 단일 소스로 계속 사용 (캘린더·일일출결과 색이 어긋나지 않도록)
- 이 작업은 컴포넌트(`src/components/`) 마크업/스타일 변경이므로 자동화 테스트 대상이 아님(프로젝트 컨벤션) — `npm run build` + `npm run lint` + 수동 스모크 테스트로 검증
- `AttendanceDeleteConfirmModal`, `AttendancePage.tsx`, `useAttendance` 훅은 수정하지 않음

---

## Task 1: 0건 뱃지용 회색 색상 상수 추가

**Files:**
- Modify: `src/lib/utils/attendanceStatusColors.ts`

**Interfaces:**
- Produces: `ATTENDANCE_ZERO_COUNT_BADGE_CLASS: string` — Task 2가 값이 0인 상태 뱃지에 사용

- [ ] **Step 1: 상수 추가**

`src/lib/utils/attendanceStatusColors.ts`의 기존 `ATTENDANCE_STATUS_COLOR_CLASS` export 바로 아래에 추가한다:

```ts
export const ATTENDANCE_STATUS_COLOR_CLASS: Record<AttendanceStatus, string> = {
  결석: 'bg-red-50 text-red-700',
  지각: 'bg-amber-50 text-amber-700',
  조퇴: 'bg-purple-50 text-purple-700',
  결과: 'bg-teal-50 text-teal-700',
}

/** MonthlyAttendanceSummary의 0건 상태 뱃지용 — 실제 값이 있는 상태 색 옆에서 눈에 띄지 않도록 무채색으로 낮춤. */
export const ATTENDANCE_ZERO_COUNT_BADGE_CLASS = 'bg-gray-50 text-gray-300'
```

파일 전체가 다음과 같아야 한다:

```ts
import type { AttendanceStatus } from '../types'

/**
 * Single source of truth for the color tied to each attendance status —
 * used by both AttendanceCalendar's day-cell tags and MonthlyAttendance
 * Summary's detail-record badges, so the two screens can never drift into
 * showing a different "결석 color" from each other. Shape (tag vs pill)
 * stays with each consumer; only the bg/text color pairing lives here.
 */
export const ATTENDANCE_STATUS_COLOR_CLASS: Record<AttendanceStatus, string> = {
  결석: 'bg-red-50 text-red-700',
  지각: 'bg-amber-50 text-amber-700',
  조퇴: 'bg-purple-50 text-purple-700',
  결과: 'bg-teal-50 text-teal-700',
}

/** MonthlyAttendanceSummary의 0건 상태 뱃지용 — 실제 값이 있는 상태 색 옆에서 눈에 띄지 않도록 무채색으로 낮춤. */
export const ATTENDANCE_ZERO_COUNT_BADGE_CLASS = 'bg-gray-50 text-gray-300'
```

- [ ] **Step 2: 빌드로 타입 에러 없는지 확인**

Run: `npm run build`
Expected: 에러 없이 성공 (이 시점에는 아직 아무도 새 상수를 참조하지 않으므로 unused-export 경고도 없어야 함)

- [ ] **Step 3: 커밋**

```bash
git add src/lib/utils/attendanceStatusColors.ts
git commit -m "feat: add zero-count badge color for monthly attendance summary"
```

---

## Task 2: MonthlyAttendanceSummary 카드형 UI로 재작성

**Files:**
- Modify: `src/components/MonthlyAttendanceSummary.tsx` (전체 교체)

**Interfaces:**
- Consumes: `ATTENDANCE_ZERO_COUNT_BADGE_CLASS` (Task 1), `ATTENDANCE_STATUS_COLOR_CLASS` (기존), `AttendanceDeleteConfirmModal` (기존, 시그니처 변경 없음)
- Produces: `MonthlyAttendanceSummary({ students, entries, deleteEntry })` — `AttendancePage.tsx`가 그대로 사용하므로 export된 컴포넌트 이름과 props 시그니처는 변경하지 않음

- [ ] **Step 1: 파일 전체를 아래 내용으로 교체**

`src/components/MonthlyAttendanceSummary.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import type { AttendanceEntry, AttendanceStatus, Student } from '../lib/types'
import { AttendanceDeleteConfirmModal } from './AttendanceDeleteConfirmModal'
import { ATTENDANCE_STATUS_COLOR_CLASS, ATTENDANCE_ZERO_COUNT_BADGE_CLASS } from '../lib/utils/attendanceStatusColors'

const STATUSES: AttendanceStatus[] = ['결석', '지각', '조퇴', '결과']

type FilterMode = 'all' | 'withRecords'

function formatMonthDay(date: string) {
  const [, month, day] = date.split('-')
  return `${Number(month)}/${Number(day)}`
}

type DeleteTarget = {
  recordId: string
  studentName: string
  date: string
  status: AttendanceStatus
}

type MonthlyAttendanceSummaryProps = {
  students: Student[]
  entries: AttendanceEntry[]
  deleteEntry: (recordId: string) => Promise<{ error?: string }>
}

type CountRow = Record<AttendanceStatus, number>

function ClassTotalCard({ status, count }: { status: AttendanceStatus; count: number }) {
  return (
    <div className={`rounded-xl px-4 py-3 ${ATTENDANCE_STATUS_COLOR_CLASS[status]}`}>
      <p className="text-xs font-semibold opacity-80">{status}</p>
      <p className="text-2xl font-bold">{count}</p>
    </div>
  )
}

function ClassTotalsCards({ totals }: { totals: CountRow }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STATUSES.map((status) => (
        <ClassTotalCard key={status} status={status} count={totals[status]} />
      ))}
    </div>
  )
}

function AttendanceBadge({ status, count }: { status: AttendanceStatus; count: number }) {
  const colorClass = count > 0 ? ATTENDANCE_STATUS_COLOR_CLASS[status] : ATTENDANCE_ZERO_COUNT_BADGE_CLASS
  return (
    <span
      aria-label={`${status} ${count}건`}
      className={`inline-flex h-6 items-center justify-center whitespace-nowrap rounded-full px-2.5 text-xs font-semibold ${colorClass}`}
    >
      {status} {count}
    </span>
  )
}

function AttendanceBadgeGroup({ counts }: { counts: CountRow }) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {STATUSES.map((status) => (
        <AttendanceBadge key={status} status={status} count={counts[status]} />
      ))}
    </div>
  )
}

type StudentSummaryCardHeaderProps = {
  student: Student
  counts: CountRow
  hasRecords: boolean
  isExpanded: boolean
  detailId: string
  onToggle: () => void
}

function StudentSummaryCardHeader({
  student,
  counts,
  hasRecords,
  isExpanded,
  detailId,
  onToggle,
}: StudentSummaryCardHeaderProps) {
  const content = (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
          {student.number}
        </span>
        <span className="text-sm font-semibold text-gray-900">{student.name}</span>
      </div>
      {hasRecords ? (
        <div className="flex items-center gap-3">
          <AttendanceBadgeGroup counts={counts} />
          {isExpanded ? (
            <ChevronDown size={16} className="shrink-0 text-brand-600" />
          ) : (
            <ChevronRight size={16} className="shrink-0 text-gray-400" />
          )}
        </div>
      ) : (
        <span className="text-sm text-gray-300">기록 없음</span>
      )}
    </div>
  )

  if (!hasRecords) {
    return content
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-controls={detailId}
      className="w-full text-left"
    >
      {content}
    </button>
  )
}

type DetailRecordProps = {
  entry: AttendanceEntry
  studentName: string
  onDeleteClick: () => void
}

function DetailRecord({ entry, studentName, onDeleteClick }: DetailRecordProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-brand-100 py-2 text-sm first:border-t-0">
      <button
        type="button"
        onClick={onDeleteClick}
        title="출결 기록 삭제"
        aria-label={`${studentName} 학생 ${formatMonthDay(entry.date)} ${entry.status} 기록 삭제`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-600 focus:outline-none"
      >
        <Trash2 size={14} />
      </button>
      <span className="w-12 shrink-0 text-gray-500">{formatMonthDay(entry.date)}</span>
      <span
        className={`inline-flex h-[22px] w-fit items-center justify-center rounded-full px-2 text-[11px] font-semibold ${ATTENDANCE_STATUS_COLOR_CLASS[entry.status]}`}
      >
        {entry.status}
      </span>
      <span className="text-gray-700">{entry.reason_category}</span>
      {entry.note && <span className="min-w-0 text-gray-600">· {entry.note}</span>}
    </div>
  )
}

export function MonthlyAttendanceSummary({ students, entries, deleteEntry }: MonthlyAttendanceSummaryProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [messageIsError, setMessageIsError] = useState(false)

  const summaryByStudent = useMemo(() => {
    const table = new Map<string, CountRow>()
    for (const student of students) {
      table.set(student.id, { 결석: 0, 지각: 0, 조퇴: 0, 결과: 0 })
    }
    for (const entry of entries) {
      const row = table.get(entry.student_id)
      if (row) {
        row[entry.status] += 1
      }
    }
    return table
  }, [students, entries])

  const classTotals = useMemo(() => {
    const totals: CountRow = { 결석: 0, 지각: 0, 조퇴: 0, 결과: 0 }
    for (const entry of entries) {
      totals[entry.status] += 1
    }
    return totals
  }, [entries])

  const recordCountByStudent = useMemo(() => {
    const map = new Map<string, number>()
    for (const [studentId, counts] of summaryByStudent) {
      map.set(studentId, STATUSES.reduce((sum, status) => sum + counts[status], 0))
    }
    return map
  }, [summaryByStudent])

  const entriesByStudent = useMemo(() => {
    const map = new Map<string, AttendanceEntry[]>()
    for (const entry of entries) {
      const list = map.get(entry.student_id) ?? []
      list.push(entry)
      map.set(entry.student_id, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.date.localeCompare(b.date))
    }
    return map
  }, [entries])

  const studentsWithRecordsCount = useMemo(
    () => students.filter((s) => (recordCountByStudent.get(s.id) ?? 0) > 0).length,
    [students, recordCountByStudent],
  )

  const visibleStudents = useMemo(
    () =>
      filterMode === 'withRecords'
        ? students.filter((s) => (recordCountByStudent.get(s.id) ?? 0) > 0)
        : students,
    [students, filterMode, recordCountByStudent],
  )

  const expandableVisibleIds = useMemo(
    () => visibleStudents.filter((s) => (recordCountByStudent.get(s.id) ?? 0) > 0).map((s) => s.id),
    [visibleStudents, recordCountByStudent],
  )
  const allVisibleExpanded =
    expandableVisibleIds.length > 0 && expandableVisibleIds.every((id) => expandedStudentIds.has(id))

  const toggleExpanded = (studentId: string) => {
    setExpandedStudentIds((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }
      return next
    })
  }

  const handleToggleAll = () => {
    setExpandedStudentIds((prev) => {
      const next = new Set(prev)
      if (allVisibleExpanded) {
        for (const id of expandableVisibleIds) next.delete(id)
      } else {
        for (const id of expandableVisibleIds) next.add(id)
      }
      return next
    })
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.recordId)
    const result = await deleteEntry(deleteTarget.recordId)
    setDeletingId(null)
    setDeleteTarget(null)

    if (result.error) {
      setMessage('기록을 삭제하지 못했습니다. 다시 시도해 주세요.')
      setMessageIsError(true)
      return
    }
    setMessage('출결 기록을 삭제했습니다.')
    setMessageIsError(false)
  }

  return (
    <div className="w-full">
      <ClassTotalsCards totals={classTotals} />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          전체 {students.length}명 · 기록 학생 {studentsWithRecordsCount}명 · 출결 기록 {entries.length}건
        </p>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-300 p-0.5">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filterMode === 'all' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              전체 {students.length}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('withRecords')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filterMode === 'withRecords' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              기록 있음 {studentsWithRecordsCount}
            </button>
          </div>
          <button
            type="button"
            onClick={handleToggleAll}
            disabled={expandableVisibleIds.length === 0}
            className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {allVisibleExpanded ? '모두 접기' : '모두 펼치기'}
          </button>
        </div>
      </div>

      {message && (
        <p
          className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
            messageIsError ? 'border-red-100 bg-red-50 text-red-700' : 'border-brand-100 bg-brand-50 text-brand-700'
          }`}
          aria-live="polite"
        >
          {message}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {visibleStudents.map((student) => {
          const counts = summaryByStudent.get(student.id) ?? { 결석: 0, 지각: 0, 조퇴: 0, 결과: 0 }
          const recordCount = recordCountByStudent.get(student.id) ?? 0
          const hasRecords = recordCount > 0
          const isExpanded = expandedStudentIds.has(student.id)
          const studentEntries = entriesByStudent.get(student.id) ?? []
          const detailId = `attendance-detail-${student.id}`

          return (
            <div
              key={student.id}
              className={`overflow-hidden rounded-xl border transition-colors ${
                !hasRecords
                  ? 'border-gray-100 bg-gray-50/60'
                  : isExpanded
                    ? 'border-brand-300 bg-brand-50/40'
                    : 'border-gray-200 bg-white hover:border-brand-200'
              }`}
            >
              <StudentSummaryCardHeader
                student={student}
                counts={counts}
                hasRecords={hasRecords}
                isExpanded={isExpanded}
                detailId={detailId}
                onToggle={() => toggleExpanded(student.id)}
              />
              {isExpanded && hasRecords && (
                <div id={detailId} className="border-t border-brand-100 px-4 pb-3 pt-1">
                  {studentEntries.map((entry) => (
                    <DetailRecord
                      key={entry.id}
                      entry={entry}
                      studentName={student.name}
                      onDeleteClick={() =>
                        setDeleteTarget({
                          recordId: entry.id,
                          studentName: student.name,
                          date: entry.date,
                          status: entry.status,
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {deleteTarget && (
        <AttendanceDeleteConfirmModal
          studentName={deleteTarget.studentName}
          date={deleteTarget.date}
          status={deleteTarget.status}
          deleting={deletingId === deleteTarget.recordId}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: 빌드로 타입 에러 없는지 확인**

Run: `npm run build`
Expected: 에러 없이 성공

- [ ] **Step 3: lint 통과 확인**

Run: `npm run lint`
Expected: 에러 없이 성공 (unused import 등 없어야 함 — `ChevronDown`, `ChevronRight`, `Trash2` 모두 실제로 쓰였는지 확인)

- [ ] **Step 4: 전체 테스트 스위트 실행 (회귀 확인)**

Run: `npm test`
Expected: 기존 179개 테스트 모두 통과 (이 컴포넌트 자체는 테스트 대상이 아니므로 테스트 개수 변화 없어야 함)

- [ ] **Step 5: 브라우저에서 수동 스모크 테스트**

`npm run dev`로 개발 서버를 띄우고 로그인 후 `/attendance` → "월간 요약" 탭에서 다음을 확인한다:

- 상단에 결석/지각/조퇴/결과 4개 통계 카드가 보이고, 값이 학생별 카드 합계와 일치하는지
- 기록이 있는 학생 카드를 클릭 — 카드 어디를 눌러도(이름, 뱃지 옆 빈 공간 등) 펼침/접기가 토글되는지
- 펼친 카드 안에 날짜/상태뱃지/사유/메모/삭제 버튼이 올바르게 나열되는지
- 값이 0인 상태 뱃지(회색)와 값이 있는 상태 뱃지(색상)가 시각적으로 구분되는지
- "전체 N / 기록 있음 N" 필터 전환이 정상 동작하는지
- "모두 펼치기" → "모두 접기" 토글이 정상 동작하는지
- 상세 기록의 삭제 버튼 클릭 → 확인 모달 → 삭제 → "출결 기록을 삭제했습니다." 메시지까지 정상 동작하는지
- 브라우저 창을 좁혀(모바일 너비) 카드/뱃지가 깨지지 않고 자연스럽게 줄바꿈되는지
- 기록이 없는 학생 카드는 클릭해도 반응 없고(비활성), 톤이 낮게(연한 배경) 표시되는지

- [ ] **Step 6: 커밋**

```bash
git add src/components/MonthlyAttendanceSummary.tsx
git commit -m "feat: redesign monthly attendance summary as stat cards + student cards"
```

---

## Self-Review Notes

- **스펙 커버리지:** 상단 통계 카드(섹션 1) → Task 2 `ClassTotalsCards`/`classTotals`. 필터+모두펼치기 유지(섹션 2) → Task 2에서 로직 변경 없이 그대로. 카드형 학생 리스트(섹션 3) → Task 2 `StudentSummaryCardHeader`/outer wrapper. 색상 원칙(섹션 4) → Task 1 + `ATTENDANCE_STATUS_COLOR_CLASS` 재사용. 반응형(섹션 5) → `flex-wrap` 적용, 데스크톱/모바일 마크업 분기 제거. 모두 반영됨.
- **타입 일관성:** `CountRow`, `AttendanceEntry`, `Student`, `DeleteTarget` 등 Task 2 전체에서 동일한 이름으로 일관되게 사용됨. `MonthlyAttendanceSummaryProps` 시그니처는 `AttendancePage.tsx`가 호출하는 형태(`students`, `entries`, `deleteEntry`)와 동일하게 유지됨.
- **플레이스홀더 없음:** 두 태스크 모두 실제 코드 전문을 포함.
