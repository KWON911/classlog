---
render_with_liquid: false
---

# 출결 일별 입력 목록 그리드 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/attendance` 페이지 상단의 학생당 한 줄짜리 세로 목록을 그리드로 바꿔 세로 공간을 줄이고, 학생 클릭 시 상태 입력 폼은 그리드 아래 고정된 한 자리에 표시한다.

**Architecture:** `AttendancePage.tsx`의 렌더링 부분만 바꾼다. 기존 `editingStudentId` 상태와 `entryByStudentAndDate` 조회 로직은 그대로 재사용하며, 어떤 학생이 편집 중인지에 따라 그 학생 정보를 미리 찾아두는 파생값 두 개(`editingStudent`, `editingEntry`)만 추가한다.

**Tech Stack:** React 19 + TypeScript, Tailwind CSS v4.

## Global Constraints

- Supabase client는 `src/lib/hooks/*.ts` 안에서만 import한다 — 이번 작업은 라우트 파일만 수정하므로 새로운 Supabase 호출을 추가하지 않는다.
- 자동화 테스트는 `src/lib/`, `src/lib/hooks/*`에만 존재한다. 라우트 파일은 `npm run build` + `npm run lint` + 수동 스모크 테스트로 검증하며, 새 테스트 파일을 추가하지 않는다.
- `AttendanceEditRow`의 props 시그니처(`initialStatus`, `initialReasonCategory`, `initialNote`, `onSave(status, reasonCategory, note)`, `onClear?`, `onCancel`)는 변경하지 않는다 — 렌더링 위치만 옮긴다.
- 입력 폼 컨테이너는 이 앱의 다른 폼과 동일하게 `rounded border border-gray-200 p-4` 스타일을 쓴다(`docs/superpowers/specs/2026-08-01-attendance-daily-grid-design.md` 참고).

---

### Task 1: 일별 입력 목록을 그리드로 전환

**Files:**
- Modify: `src/routes/AttendancePage.tsx`

**Interfaces:**
- Consumes: 이 파일에 이미 있는 `students`, `entryByStudentAndDate`, `editingStudentId`/`setEditingStudentId`, `handleSave`, `handleClear` — 모두 변경 없이 그대로 사용.
- Produces: 이 파일 내부에서만 쓰이는 지역 파생값이라 다른 파일이 의존하는 인터페이스는 없음.

- [ ] **Step 1: 편집 중인 학생과 그 학생의 현재 예외를 미리 찾아두는 파생값 추가**

`toggleExpanded` 함수 정의가 끝나는 지점, 현재:
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

  const days = Array.from({ length: daysInMonth(yearMonth) }, (_, i) => i + 1)
```
다음으로 교체(`days` 앞에 두 줄 추가):
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

  const editingStudent = students.find((s) => s.id === editingStudentId)
  const editingEntry = editingStudentId
    ? entryByStudentAndDate.get(`${editingStudentId}_${selectedDate}`)
    : undefined

  const days = Array.from({ length: daysInMonth(yearMonth) }, (_, i) => i + 1)
```

- [ ] **Step 2: `<ul>` 목록을 그리드 + 고정 입력 영역으로 교체**

현재:
```tsx
      <ul className="mb-8 flex flex-col gap-2">
        {students.map((student) => {
          const entry = entryByStudentAndDate.get(`${student.id}_${selectedDate}`)
          const isEditing = editingStudentId === student.id
          return (
            <li key={student.id} className="rounded border border-gray-200 p-3">
              <button
                onClick={() => setEditingStudentId(isEditing ? null : student.id)}
                className="flex w-full items-center justify-between text-left"
              >
                <span>
                  {student.number}. {student.name}
                </span>
                <span className={entry ? 'text-red-600' : 'text-gray-400'}>
                  {entry ? `${entry.status} (${entry.reason_category})` : '출석'}
                </span>
              </button>

              {isEditing && (
                <AttendanceEditRow
                  initialStatus={entry?.status}
                  initialReasonCategory={entry?.reason_category}
                  initialNote={entry?.note ?? undefined}
                  onSave={(status, reasonCategory, note) =>
                    handleSave(student.id, status, reasonCategory, note)
                  }
                  onClear={entry ? () => handleClear(student.id) : undefined}
                  onCancel={() => setEditingStudentId(null)}
                />
              )}
            </li>
          )
        })}
      </ul>
```
다음으로 교체:
```tsx
      <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {students.map((student) => {
          const entry = entryByStudentAndDate.get(`${student.id}_${selectedDate}`)
          return (
            <button
              key={student.id}
              onClick={() =>
                setEditingStudentId(editingStudentId === student.id ? null : student.id)
              }
              className={`rounded border border-gray-200 p-2 text-sm ${entry ? 'text-red-600' : ''}`}
            >
              {student.number}. {student.name}
            </button>
          )
        })}
      </div>

      {editingStudent && (
        <div className="mb-8 rounded border border-gray-200 p-4">
          <p className="mb-2 text-sm font-medium">
            {editingStudent.number}. {editingStudent.name} 입력:
          </p>
          <AttendanceEditRow
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
```

- [ ] **Step 3: 빌드와 린트 확인**

Run: `npm run build`
Expected: 타입 에러 없이 성공.

Run: `npm run lint`
Expected: 에러 없음.

- [ ] **Step 4: 수동 스모크 테스트**

`npm run dev`로 개발 서버를 띄우고 로그인한 뒤 `/attendance` 페이지에서 확인한다:
- 학생 목록이 여러 열의 그리드로 표시되는지(한 줄에 여러 명), 세로 공간이 이전보다 확연히 줄었는지
- 그 날짜에 출결 예외가 있는 학생만 이름이 빨간색으로 보이는지(예: 결석 기록이 있는 학생)
- 학생 셀 클릭 → 그리드 아래에 "N. 이름 입력:" 레이블과 입력 폼(상태/사유/메모/저장/취소, 예외가 있으면 "출석으로 되돌리기"도)이 나타나는지
- 다른 학생 셀을 클릭 → 이전 학생의 폼이 사라지고 새 학생의 폼으로 바뀌는지(폼에 표시되는 이름과 초기값이 새 학생 것으로 정확히 바뀌는지)
- 같은 학생 셀을 다시 클릭 → 폼이 닫히는지
- 폼에서 상태를 저장 → 그리드에서 그 학생 이름이 빨간색으로 바뀌고 폼이 닫히는지
- "출석으로 되돌리기" 클릭 → 그리드에서 이름이 다시 기본 색으로 돌아오고 폼이 닫히는지
- 월/날짜를 이동(◀/▶ 또는 날짜 선택) → 열려있던 입력 폼이 닫히는지(기존 동작 유지 확인)
- 하단 "학급 전체 요약" 표(이름 클릭 시 상세 기록 펼치기)는 이번 변경과 무관하게 그대로 동작하는지

- [ ] **Step 5: 커밋**

```bash
git add src/routes/AttendancePage.tsx
git commit -m "feat: convert attendance daily list to a grid with a fixed edit area"
```
