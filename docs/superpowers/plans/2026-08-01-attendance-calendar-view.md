# 출결 월간 캘린더 뷰 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/attendance` 페이지의 "학급 전체 요약" 표 바로 위에, 그 달의 출결 예외를 월~금 요일별 캘린더 그리드로 보여주는 뷰를 추가한다.

**Architecture:** 새 컴포넌트 `src/components/AttendanceCalendar.tsx`가 `yearMonth`/`entries`/`students`를 props로 받아 요일 그리드를 계산하고 렌더링한다. `AttendancePage.tsx`는 이미 갖고 있는 값을 그대로 넘겨주는 한 줄만 추가한다 — 새 쿼리, 새 훅, 새 상태 없음.

**Tech Stack:** React 19 + TypeScript, Tailwind CSS v4.

## Global Constraints

- Supabase client는 `src/lib/hooks/*.ts` 안에서만 import한다 — 이번 작업은 컴포넌트와 라우트 파일만 수정하므로 새로운 Supabase 호출을 추가하지 않는다.
- 자동화 테스트는 `src/lib/`, `src/lib/hooks/*`에만 존재한다. 컴포넌트/라우트 파일은 `npm run build` + `npm run lint` + 수동 스모크 테스트로 검증하며, 새 테스트 파일을 추가하지 않는다.
- "교외" 같은 새 카테고리/라벨은 도입하지 않는다 — 기존 `AttendanceStatus`(결석/지각/조퇴/결과) x `AttendanceReasonCategory`(질병/미인정/인정/기타) 조합만 사용한다.
- 캘린더 셀 라벨은 `${entry.reason_category}${entry.status}` 형태로 그대로 이어붙인다(별도 축약 규칙 없음).
- 캘린더는 월~금 5개 요일 열만 표시한다(토/일 제외).

---

### Task 1: `AttendanceCalendar` 컴포넌트 생성 및 `AttendancePage`에 연결

**Files:**
- Create: `src/components/AttendanceCalendar.tsx`
- Modify: `src/routes/AttendancePage.tsx`

**Interfaces:**
- Consumes: `AttendanceEntry`, `Student` 타입(`src/lib/types.ts`, 기존). `AttendancePage`가 이미 갖고 있는 `yearMonth: string`, `entries: AttendanceEntry[]`(from `useAttendance`), `students: Student[]`(from `useStudents`).
- Produces: `AttendanceCalendar({ yearMonth, entries, students }: { yearMonth: string, entries: AttendanceEntry[], students: Student[] })` — `AttendancePage.tsx`에서만 사용.

- [ ] **Step 1: `AttendanceCalendar.tsx` 작성**

Create `src/components/AttendanceCalendar.tsx`:

```tsx
import type { AttendanceEntry, Student } from '../lib/types'

type AttendanceCalendarProps = {
  yearMonth: string
  entries: AttendanceEntry[]
  students: Student[]
}

type DayCell = { day: number; date: string } | null

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금']

function buildWeeks(yearMonth: string): DayCell[][] {
  const [year, month] = yearMonth.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()

  const weeks: DayCell[][] = []
  let currentWeek: DayCell[] = [null, null, null, null, null]
  let started = false

  for (let day = 1; day <= daysInMonth; day++) {
    const dayOfWeek = new Date(year, month - 1, day).getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) continue

    const column = dayOfWeek - 1
    if (column === 0 && started) {
      weeks.push(currentWeek)
      currentWeek = [null, null, null, null, null]
    }

    currentWeek[column] = { day, date: `${yearMonth}-${String(day).padStart(2, '0')}` }
    started = true
  }

  if (started) {
    weeks.push(currentWeek)
  }

  return weeks
}

export function AttendanceCalendar({ yearMonth, entries, students }: AttendanceCalendarProps) {
  const studentNameById = new Map(students.map((s) => [s.id, s.name]))

  const entriesByDate = new Map<string, AttendanceEntry[]>()
  for (const entry of entries) {
    const list = entriesByDate.get(entry.date) ?? []
    list.push(entry)
    entriesByDate.set(entry.date, list)
  }

  const weeks = buildWeeks(yearMonth)

  return (
    <div className="mb-8">
      <div className="grid grid-cols-5 gap-2">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-sm font-medium text-gray-500">
            {label}
          </div>
        ))}
        {weeks.map((week, weekIndex) =>
          week.map((cell, columnIndex) => (
            <div
              key={`${weekIndex}-${columnIndex}`}
              className="min-h-20 rounded border border-gray-200 p-1 text-xs"
            >
              {cell && (
                <>
                  <div className="mb-1 text-gray-500">{cell.day}</div>
                  <div className="flex flex-col gap-1">
                    {(entriesByDate.get(cell.date) ?? []).map((entry) => (
                      <div key={entry.id} className="rounded bg-red-50 p-1">
                        <div className="font-medium text-red-600">
                          {entry.reason_category}
                          {entry.status}
                        </div>
                        <div>{studentNameById.get(entry.student_id) ?? '알 수 없음'}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )),
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: import 추가**

`src/routes/AttendancePage.tsx`의 현재:
```tsx
import { AttendanceEditRow } from '../components/AttendanceEditRow'
import type { AttendanceReasonCategory, AttendanceStatus } from '../lib/types'
```
다음으로 교체:
```tsx
import { AttendanceEditRow } from '../components/AttendanceEditRow'
import { AttendanceCalendar } from '../components/AttendanceCalendar'
import type { AttendanceReasonCategory, AttendanceStatus } from '../lib/types'
```

- [ ] **Step 3: "학급 전체 요약" 표 위에 캘린더 렌더링**

`src/routes/AttendancePage.tsx`의 현재(편집 폼 블록이 끝나고 요약 표 제목이 시작되는 지점):
```tsx
      {editingStudent && (
        <div className="mb-8 rounded border border-gray-200 p-4">
          <p className="mb-2 text-sm font-medium">
            {editingStudent.number}. {editingStudent.name} 입력:
          </p>
          <AttendanceEditRow
            key={editingStudent.id}
            initialStatus={editingEntry?.status}
            initialReasonCategory={editingEntry?.reason_category}
            initialNote={editingEntry?.note ?? undefined}
            onSave={(status, reasonCategory, note) =>
              handleSave(editingStudent.id, status, reasonCategory, note)
            }
            onClear={editingEntry ? () => handleClear(editingStudent.id) : undefined}
            onCancel={() => setEditingStudentId(null)}
          />
        </div>
      )}

      <h2 className="mb-2 text-lg font-semibold">{yearMonth} 학급 전체 요약</h2>
```
다음으로 교체(편집 폼 블록과 요약 표 제목 사이에 캘린더 추가):
```tsx
      {editingStudent && (
        <div className="mb-8 rounded border border-gray-200 p-4">
          <p className="mb-2 text-sm font-medium">
            {editingStudent.number}. {editingStudent.name} 입력:
          </p>
          <AttendanceEditRow
            key={editingStudent.id}
            initialStatus={editingEntry?.status}
            initialReasonCategory={editingEntry?.reason_category}
            initialNote={editingEntry?.note ?? undefined}
            onSave={(status, reasonCategory, note) =>
              handleSave(editingStudent.id, status, reasonCategory, note)
            }
            onClear={editingEntry ? () => handleClear(editingStudent.id) : undefined}
            onCancel={() => setEditingStudentId(null)}
          />
        </div>
      )}

      <AttendanceCalendar yearMonth={yearMonth} entries={entries} students={students} />

      <h2 className="mb-2 text-lg font-semibold">{yearMonth} 학급 전체 요약</h2>
```

- [ ] **Step 4: 빌드와 린트 확인**

Run: `npm run build`
Expected: 타입 에러 없이 성공.

Run: `npm run lint`
Expected: 에러 없음.

- [ ] **Step 5: 수동 스모크 테스트**

`npm run dev`로 개발 서버를 띄우고 로그인한 뒤 `/attendance` 페이지에서 확인한다:
- "학급 전체 요약" 표 바로 위에 월~금 5열 캘린더가 나타나는지
- 그 달 1일이 어느 요일이든(화~금 시작 등) 첫 주 앞부분이 자연스럽게 빈 칸으로 정렬되는지, 날짜 숫자가 올바른 요일 열에 표시되는지
- 예외 기록이 있는 날짜 셀에 "사유+상태" 라벨(예: "질병결석")과 학생 이름이 표시되는지, 없는 날짜는 비어 있는지
- 한 날짜에 여러 학생의 예외가 있으면 그 셀 안에 세로로 모두 나열되는지(같은 날짜에 서로 다른 두 학생에게 예외를 입력해서 확인)
- 페이지 상단 월 이동(◀/▶)을 누르면 캘린더도 함께 새 달의 요일 배치와 데이터로 갱신되는지
- 캘린더 추가로 인해 위쪽의 일별 입력 그리드나 아래쪽의 "학급 전체 요약" 표(이름 클릭 시 상세 기록 펼치기 포함)가 깨지지 않는지

- [ ] **Step 6: 커밋**

```bash
git add src/components/AttendanceCalendar.tsx src/routes/AttendancePage.tsx
git commit -m "feat: add monthly calendar view to the attendance page"
```
