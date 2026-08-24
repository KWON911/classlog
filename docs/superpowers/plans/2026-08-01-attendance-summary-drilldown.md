---
render_with_liquid: false
---

# 출결 요약 표 학생별 상세 기록 펼치기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/attendance` 페이지의 학급 전체 요약 표에서 학생 이름을 클릭하면 그 달의 날짜별 출결 예외 기록(상태·사유·메모)이 해당 행 아래에 펼쳐지도록 한다.

**Architecture:** 새 쿼리나 훅 없이, 이미 `useAttendance(yearMonth)`가 갖고 있는 `entries`를 학생별로 그룹핑·정렬한 파생 데이터(`entriesByStudent`)와 펼침 상태(`expandedStudentIds: Set<string>`)를 `AttendancePage.tsx`에 추가하고, 요약 표의 렌더링만 바꾼다.

**Tech Stack:** React 19 + TypeScript, Tailwind CSS v4.

## Global Constraints

- Supabase client는 `src/lib/hooks/*.ts` 안에서만 import한다 — 이번 작업은 라우트 파일만 수정하므로 새로운 Supabase 호출을 추가하지 않는다.
- 자동화 테스트는 `src/lib/`, `src/lib/hooks/*`에만 존재한다. 라우트 파일(`src/routes/*`)은 `npm run build` + `npm run lint` + 수동 스모크 테스트로 검증하며, 이번 작업도 이 컨벤션을 따른다 — 새 테스트 파일을 추가하지 않는다.
- 월 이동(◀/▶) 시 기존 `editingStudentId`는 초기화되지만, 새로 추가하는 `expandedStudentIds`는 초기화하지 않는다(읽기 전용 표시라 스테일 데이터로 잘못 저장될 위험이 없음 — `docs/superpowers/specs/2026-08-01-attendance-summary-drilldown-design.md` 참고).

---

### Task 1: 요약 표에 학생별 상세 기록 펼치기 추가

**Files:**
- Modify: `src/routes/AttendancePage.tsx`

**Interfaces:**
- Consumes: `useAttendance(yearMonth)`가 반환하는 기존 `entries: AttendanceEntry[]` (필드: `id`, `student_id`, `date`, `status`, `reason_category`, `note`) — 이미 이 파일에서 사용 중, 변경 없음.
- Produces: 이 파일 내부에서만 쓰이는 지역 상태/파생값이라 다른 파일이 의존하는 인터페이스는 없음.

이 태스크는 `src/routes/AttendancePage.tsx` 한 파일에 5곳을 수정한다. 각 수정은 파일의 현재 내용(아래 앵커 텍스트)을 정확히 찾아 그 위치에 적용한다.

- [ ] **Step 1: `Fragment`를 import에 추가**

파일 맨 위, 현재:
```tsx
import { useMemo, useState } from 'react'
```
다음으로 교체:
```tsx
import { Fragment, useMemo, useState } from 'react'
```

- [ ] **Step 2: 날짜 포맷 헬퍼 추가**

`daysInMonth` 함수 정의 바로 다음(현재 아래 블록이 끝나는 지점):
```tsx
function daysInMonth(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}
```
바로 아래에 새 함수를 추가:
```tsx

function formatMonthDay(date: string) {
  const [, month, day] = date.split('-')
  return `${Number(month)}/${Number(day)}`
}
```

- [ ] **Step 3: 펼침 상태와 파생 데이터 추가**

현재:
```tsx
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)

  const { students, error: studentsError } = useStudents()
```
다음으로 교체(`expandedStudentIds` 상태 한 줄 추가):
```tsx
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(new Set())

  const { students, error: studentsError } = useStudents()
```

그리고 `summaryByStudent`의 `useMemo` 블록이 끝나는 지점, 현재:
```tsx
  const summaryByStudent = useMemo(() => {
    const table = new Map<string, Record<AttendanceStatus, number>>()
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
```
바로 아래에 새 `useMemo`를 추가:
```tsx

  const entriesByStudent = useMemo(() => {
    const map = new Map<string, typeof entries>()
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
```

- [ ] **Step 4: 토글 핸들러 추가**

`handleClear` 함수 정의 바로 다음, 현재:
```tsx
  const handleClear = async (studentId: string) => {
    await clearEntry(studentId, selectedDate)
    setEditingStudentId(null)
  }
```
바로 아래에 새 핸들러를 추가:
```tsx

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
```

- [ ] **Step 5: 요약 표의 `<tbody>`를 펼침 가능한 구조로 교체**

현재:
```tsx
        <tbody>
          {students.map((student) => {
            const row = summaryByStudent.get(student.id)
            return (
              <tr key={student.id} className="border-b border-gray-100">
                <td className="py-1">
                  {student.number}. {student.name}
                </td>
                {STATUSES.map((status) => (
                  <td key={status} className="py-1 text-center">
                    {row?.[status] ?? 0}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
```
다음으로 교체:
```tsx
        <tbody>
          {students.map((student) => {
            const row = summaryByStudent.get(student.id)
            const isExpanded = expandedStudentIds.has(student.id)
            const studentEntries = entriesByStudent.get(student.id) ?? []
            return (
              <Fragment key={student.id}>
                <tr className="border-b border-gray-100">
                  <td className="py-1">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(student.id)}
                      className="text-left hover:underline"
                    >
                      {isExpanded ? '▾' : '▸'} {student.number}. {student.name}
                    </button>
                  </td>
                  {STATUSES.map((status) => (
                    <td key={status} className="py-1 text-center">
                      {row?.[status] ?? 0}
                    </td>
                  ))}
                </tr>
                {isExpanded && (
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <td colSpan={STATUSES.length + 1} className="py-2 pl-6 text-sm text-gray-600">
                      {studentEntries.length === 0 ? (
                        '이번 달 기록 없음'
                      ) : (
                        <ul className="flex flex-col gap-1">
                          {studentEntries.map((entry) => (
                            <li key={entry.id}>
                              {formatMonthDay(entry.date)} {entry.status}({entry.reason_category})
                              {entry.note ? ` - ${entry.note}` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
```

- [ ] **Step 6: 빌드와 린트 확인**

Run: `npm run build`
Expected: 타입 에러 없이 성공.

Run: `npm run lint`
Expected: 에러 없음.

- [ ] **Step 7: 수동 스모크 테스트**

`npm run dev`로 개발 서버를 띄우고 로그인한 뒤 `/attendance` 페이지에서 확인한다:
- 상단 날짜별 입력 UI에서 한 학생에게 결석/지각 등 예외를 2개 이상, 서로 다른 날짜로 기록해둔다(메모 포함 1건, 메모 없이 1건).
- 학급 전체 요약 표에서 그 학생 이름을 클릭 → 이름 앞 화살표가 ▸에서 ▾로 바뀌고, 바로 아래 행에 두 기록이 날짜 오름차순으로 나타나는지, 메모가 있는 줄엔 ` - 메모` 가 붙고 없는 줄엔 안 붙는지 확인.
- 예외 기록이 없는 다른 학생 이름을 클릭 → "이번 달 기록 없음"이 표시되는지 확인.
- 두 학생을 동시에 펼쳐두고 서로 독립적으로 펼침/닫힘이 유지되는지 확인.
- ◀/▶로 월을 이동 → 펼쳐둔 학생의 펼침 상태는 유지된 채로 내용물이 새 달의 데이터로 바뀌는지(기록이 없으면 "이번 달 기록 없음"으로 바뀌는지) 확인.
- 다시 이름을 클릭해 닫히는지 확인.

- [ ] **Step 8: 커밋**

```bash
git add src/routes/AttendancePage.tsx
git commit -m "feat: expand per-student attendance detail in the monthly summary table"
```
