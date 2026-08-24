---
render_with_liquid: false
---

# 학생 상세정보/삭제를 정보관리로 일원화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학급기록의 학생 상세 페이지(`/students/:id`, `StudentDetailPage.tsx`)에서 "학생 삭제"와 "상세정보 보기"(읽기 전용 필드 목록)를 제거하고, "상세정보 보기"는 정보관리(`/students/manage`)로 옮긴다. 학급기록 상세 페이지는 출결 요약 + 생활기록/상담(누가기록)만 남는다.

**Architecture:** 정보관리(`StudentListCard`)는 이미 학생별 "학생 정보 수정"/"학생 삭제" 드롭다운 메뉴(`StudentRowMenu`)를 갖고 있으므로, 여기에 "상세정보 보기" 메뉴 항목 하나를 추가하고 새 읽기 전용 모달 컴포넌트(`StudentDetailModal`)를 연결한다. 이 모달의 내용은 `StudentDetailPage`가 지금까지 써온 `StudentDetailCard`의 읽기 전용 `<dl>` 블록을 그대로 옮긴 것이다. 학급기록 상세 페이지의 삭제 기능은 정보관리에 이미 동일한 기능이 있으므로 새로 옮기지 않고 단순 제거한다 — 두 곳에 중복된 삭제 진입점을 둘 이유가 없다. 마지막으로 이제 아무도 쓰지 않게 되는 `StudentDetailCard.tsx`를 삭제하고, `CLAUDE.md`의 "Roster split" 설명을 갱신한다.

**Tech Stack:** React 19 + TypeScript, React Router 7, Tailwind CSS v4 (신규 의존성 없음)

## Global Constraints

- 정보관리(`StudentManagePage`/`StudentListCard`)는 이미 학생별 "학생 정보 수정"(`StudentForm` 모달)과 "학생 삭제"(확인 다이얼로그 + `deleteStudent`) 기능을 갖고 있다 — 이번 작업으로 그 기능들을 다시 만들지 않는다. `StudentRowMenu.tsx`에 세 번째 메뉴 항목("상세정보 보기")만 추가한다.
- 정보관리의 기존 모달 관례는 `src/components/Modal.tsx`(제목/설명/닫기 버튼이 있는 범용 다이얼로그)다 — 새 상세정보 모달도 이 컴포넌트를 그대로 재사용한다.
- 읽기 전용 상세정보의 필드 목록·표시 방식(`<dl>` 그리드, 빈 값은 "미입력"으로 표시)은 지금 `src/components/StudentDetailCard.tsx`의 비-편집 모드 블록과 동일해야 한다 — 필드 순서와 라벨을 그대로 옮긴다.
- 학급기록 상세 페이지(`StudentDetailPage.tsx`)에서 학생 삭제 기능을 제거한 뒤에도, 학생을 삭제하고 싶은 교사는 정보관리(`/students/manage`)로 이동해 동일한 작업을 할 수 있다 — 기능 손실이 아니라 진입점 일원화다.
- `StudentDetailPage.tsx`에서 "상세정보 보기"/"학생 삭제"와 그에 딸린 미저장 변경사항 확인(`pendingAction`/`runOrConfirm`) 로직을 모두 제거하면, 이 페이지에는 더 이상 학생 정보를 수정하는 흐름이 없다 — 학생 간 이전/다음 이동과 목록으로 돌아가기는 확인 없이 바로 이동하도록 단순화한다.
- `StudentDetailCard.tsx`는 이 계획 완료 후 어디서도 참조되지 않는 죽은 코드가 된다 — 남겨두지 말고 삭제한다.
- `StudentListItem.tsx`, `StudentDetailPage.tsx`, `StudentListCard.tsx`, `StudentRowMenu.tsx`, `StudentDetailModal.tsx`는 모두 컴포넌트/라우트라 이 프로젝트의 자동화 테스트 대상이 아니다 — `npm run build` + `npm run lint` + 수동 스모크로 검증한다.

---

### Task 1: 정보관리에 "상세정보 보기" 읽기 전용 모달 추가

**Files:**
- Create: `src/components/manage/StudentDetailModal.tsx`
- Modify: `src/components/manage/StudentRowMenu.tsx`
- Modify: `src/components/manage/StudentListCard.tsx`

**Interfaces:**
- Consumes: `Modal`(`src/components/Modal.tsx`, 이미 존재), `Student`(`src/lib/types.ts`, 이미 존재)
- Produces: `StudentDetailModal({ student, onClose }): JSX.Element` — 이 파일 자체에서 `StudentListCard.tsx`가 바로 사용한다(다른 태스크가 이어받을 인터페이스 없음).

- [ ] **Step 1: 읽기 전용 상세정보 모달 컴포넌트 작성**

`src/components/manage/StudentDetailModal.tsx` 새로 생성:

```tsx
import { Modal } from '../Modal'
import type { Student } from '../../lib/types'

type StudentDetailModalProps = {
  student: Student
  onClose: () => void
}

function displayValue(value: string | null) {
  return value && value.trim() ? value : '미입력'
}

export function StudentDetailModal({ student, onClose }: StudentDetailModalProps) {
  return (
    <Modal title="학생 상세정보" description={`${student.number}. ${student.name}`} onClose={onClose}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <dt className="text-gray-500">출석번호</dt>
        <dd className="font-medium text-gray-900">{student.number}</dd>
        <dt className="text-gray-500">이름</dt>
        <dd className="font-medium text-gray-900">{student.name}</dd>
        <dt className="text-gray-500">성별</dt>
        <dd className="font-medium text-gray-900">{displayValue(student.gender)}</dd>
        <dt className="text-gray-500">생년월일</dt>
        <dd className="font-medium text-gray-900">{displayValue(student.birthdate)}</dd>
        <dt className="text-gray-500">본인 연락처</dt>
        <dd className="font-medium text-gray-900">{displayValue(student.student_phone)}</dd>
        <dt className="text-gray-500">주소</dt>
        <dd className="font-medium text-gray-900">{displayValue(student.address)}</dd>
        <dt className="text-gray-500">부 성명</dt>
        <dd className="font-medium text-gray-900">{displayValue(student.father_name)}</dd>
        <dt className="text-gray-500">부 연락처</dt>
        <dd className="font-medium text-gray-900">{displayValue(student.father_phone)}</dd>
        <dt className="text-gray-500">모 성명</dt>
        <dd className="font-medium text-gray-900">{displayValue(student.mother_name)}</dd>
        <dt className="text-gray-500">모 연락처</dt>
        <dd className="font-medium text-gray-900">{displayValue(student.mother_phone)}</dd>
        <dt className="text-gray-500">비상연락처</dt>
        <dd className="font-medium text-gray-900">{displayValue(student.emergency_contact)}</dd>
        <dt className="text-gray-500">비고</dt>
        <dd className="font-medium text-gray-900">{displayValue(student.note)}</dd>
      </dl>
    </Modal>
  )
}
```

- [ ] **Step 2: `StudentRowMenu`에 "상세정보 보기" 메뉴 항목 추가**

`src/components/manage/StudentRowMenu.tsx` 현재 전체 내용:

```tsx
import { useEffect, useRef, useState } from 'react'

type StudentRowMenuProps = {
  studentName: string
  onEdit: () => void
  onDelete: () => void
}

export function StudentRowMenu({ studentName, onEdit, onDelete }: StudentRowMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label={`${studentName} 학생 관리 메뉴`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="4" r="1.6" fill="currentColor" />
          <circle cx="10" cy="10" r="1.6" fill="currentColor" />
          <circle cx="10" cy="16" r="1.6" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={`${studentName} 학생 관리 메뉴`}
          className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 text-sm"
          style={{ boxShadow: '0 12px 30px -8px rgba(15, 23, 42, 0.18)' }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
            className="block w-full px-3 py-2 text-left text-gray-700 transition-colors hover:bg-gray-50"
          >
            학생 정보 수정
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
            className="block w-full px-3 py-2 text-left text-red-600 transition-colors hover:bg-red-50"
          >
            학생 삭제
          </button>
        </div>
      )}
    </div>
  )
}
```

다음으로 전체 교체:

```tsx
import { useEffect, useRef, useState } from 'react'

type StudentRowMenuProps = {
  studentName: string
  onViewDetails: () => void
  onEdit: () => void
  onDelete: () => void
}

export function StudentRowMenu({ studentName, onViewDetails, onEdit, onDelete }: StudentRowMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label={`${studentName} 학생 관리 메뉴`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="4" r="1.6" fill="currentColor" />
          <circle cx="10" cy="10" r="1.6" fill="currentColor" />
          <circle cx="10" cy="16" r="1.6" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={`${studentName} 학생 관리 메뉴`}
          className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 text-sm"
          style={{ boxShadow: '0 12px 30px -8px rgba(15, 23, 42, 0.18)' }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onViewDetails()
            }}
            className="block w-full px-3 py-2 text-left text-gray-700 transition-colors hover:bg-gray-50"
          >
            상세정보 보기
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
            className="block w-full px-3 py-2 text-left text-gray-700 transition-colors hover:bg-gray-50"
          >
            학생 정보 수정
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
            className="block w-full px-3 py-2 text-left text-red-600 transition-colors hover:bg-red-50"
          >
            학생 삭제
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: `StudentListCard`에서 모달 상태 추가 및 연결**

`src/components/manage/StudentListCard.tsx` 상단 import 블록 현재:

```tsx
import { useMemo, useState } from 'react'
import { Download, Plus, Upload, UsersRound } from 'lucide-react'
import { Modal } from '../Modal'
import { ConfirmDialog } from '../ConfirmDialog'
import { ImportStudentsPanel } from '../ImportStudentsPanel'
import { StudentForm, type StudentFormValues } from '../StudentForm'
import { StudentRowMenu } from './StudentRowMenu'
import { QuickAddFab } from '../QuickAddFab'
import { mapGender } from '../../lib/seating'
```

다음으로 변경(한 줄 추가):

```tsx
import { useMemo, useState } from 'react'
import { Download, Plus, Upload, UsersRound } from 'lucide-react'
import { Modal } from '../Modal'
import { ConfirmDialog } from '../ConfirmDialog'
import { ImportStudentsPanel } from '../ImportStudentsPanel'
import { StudentForm, type StudentFormValues } from '../StudentForm'
import { StudentRowMenu } from './StudentRowMenu'
import { StudentDetailModal } from './StudentDetailModal'
import { QuickAddFab } from '../QuickAddFab'
import { mapGender } from '../../lib/seating'
```

`StudentListCard` 함수 본문에서 현재:

```tsx
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null)
```

다음으로 변경(한 줄 추가):

```tsx
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null)
```

학생 행을 렌더링하는 부분(`<StudentRowMenu ... />` 호출부) 현재:

```tsx
                    <span className="flex justify-center">
                      <StudentRowMenu
                        studentName={student.name}
                        onEdit={() => setEditingStudent(student)}
                        onDelete={() => setDeleteTarget(student)}
                      />
                    </span>
```

다음으로 변경:

```tsx
                    <span className="flex justify-center">
                      <StudentRowMenu
                        studentName={student.name}
                        onViewDetails={() => setViewingStudent(student)}
                        onEdit={() => setEditingStudent(student)}
                        onDelete={() => setDeleteTarget(student)}
                      />
                    </span>
```

`editingStudent` 모달을 렌더링하는 블록 바로 앞에(즉 `{editingStudent && (` 시작 직전에) 다음 블록을 추가:

```tsx
      {viewingStudent && (
        <StudentDetailModal student={viewingStudent} onClose={() => setViewingStudent(null)} />
      )}

```

(`editingStudent && (<Modal ...>` 블록은 그대로 두고, 그 위에 이 블록만 새로 삽입한다.)

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 타입 에러 없이 성공

- [ ] **Step 5: 린트 확인**

Run: `npm run lint`
Expected: 통과

- [ ] **Step 6: 전체 테스트 확인**

Run: `npm test`
Expected: 기존 테스트 전부 통과 (컴포넌트는 자동화 테스트 대상이 아니므로 회귀 확인 목적)

- [ ] **Step 7: 수동 브라우저 확인**

`npm run dev`로 로그인 후 `/students/manage`에서:
- 학생 행의 관리 메뉴(⋮)를 열면 "상세정보 보기"가 "학생 정보 수정"/"학생 삭제" 위에 첫 번째 항목으로 보이는지 확인
- "상세정보 보기" 클릭 → 모달이 열리고 출석번호/이름/성별/생년월일/연락처/주소/부모 정보/비상연락처/비고가 읽기 전용으로 표시되는지 확인, 빈 값은 "미입력"으로 나오는지 확인
- 모달의 ✕ 버튼 또는 배경 클릭, Esc 키로 모달이 닫히는지 확인
- 같은 메뉴에서 "학생 정보 수정"과 "학생 삭제"가 기존처럼 정상 동작하는지 확인(회귀 없음)

- [ ] **Step 8: 커밋**

```bash
git add src/components/manage/StudentDetailModal.tsx src/components/manage/StudentRowMenu.tsx src/components/manage/StudentListCard.tsx
git commit -m "feat: add read-only student detail modal to 정보관리"
```

---

### Task 2: 학급기록 상세 페이지에서 삭제/상세정보 제거

**Files:**
- Modify: `src/routes/StudentDetailPage.tsx`
- Delete: `src/components/StudentDetailCard.tsx`

**Interfaces:**
- Consumes: 없음 (Task 1과 파일이 겹치지 않는 독립적인 변경)
- Produces: 없음

- [ ] **Step 1: `StudentDetailPage.tsx`를 아래 내용으로 전체 교체**

`src/routes/StudentDetailPage.tsx`의 현재 전체 내용을 다음으로 완전히 교체한다:

```tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useStudents } from '../lib/hooks/useStudents'
import { useStudentRecords } from '../lib/hooks/useStudentRecords'
import { useAttendanceSummary } from '../lib/hooks/useAttendanceSummary'
import { PageContainer } from '../components/PageContainer'
import { RecordForm, type RecordFormValues } from '../components/RecordForm'
import { RecordTimeline } from '../components/RecordTimeline'
import { primaryButtonClass, sectionCardClass } from '../lib/ui/classNames'
import { ATTENDANCE_STATUS_COLOR_CLASS } from '../lib/utils/attendanceStatusColors'
import type { AttendanceStatus, StudentRecord } from '../lib/types'

const ATTENDANCE_SUMMARY_LABELS: AttendanceStatus[] = ['결석', '지각', '조퇴', '결과']

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { students, loading: studentsLoading, error: studentsError } = useStudents()
  const { records, loading, error, addRecord, updateRecord, deleteRecord } = useStudentRecords(id ?? '')
  const { summary: attendanceSummary, error: attendanceError } = useAttendanceSummary(id ?? '')

  const [showRecordForm, setShowRecordForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<StudentRecord | null>(null)

  useEffect(() => {
    setShowRecordForm(false)
    setEditingRecord(null)
  }, [id])

  const student = students.find((s) => s.id === id)
  const currentIndex = students.findIndex((s) => s.id === id)
  const prevStudent = currentIndex > 0 ? students[currentIndex - 1] : null
  const nextStudent = currentIndex >= 0 && currentIndex < students.length - 1 ? students[currentIndex + 1] : null

  if (!student) {
    if (studentsLoading) {
      return <p className="p-6">불러오는 중...</p>
    }
    return (
      <div className="p-6">
        {studentsError && <p className="text-red-600">{studentsError}</p>}
        <p>{studentsError ? '학생 정보를 불러오지 못했습니다.' : '존재하지 않는 학생입니다.'}</p>
      </div>
    )
  }

  const handleAddRecord = async (values: RecordFormValues) => {
    const result = await addRecord(values)
    if (!result.error) {
      setShowRecordForm(false)
    }
  }

  const handleUpdateRecord = async (values: RecordFormValues) => {
    if (!editingRecord) return
    const result = await updateRecord(editingRecord.id, values)
    if (!result.error) {
      setEditingRecord(null)
    }
  }

  return (
    <PageContainer size="standard" maxWidth="1200px">
      <button
        type="button"
        onClick={() => navigate('/students')}
        className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
      >
        ← 학생 목록으로 돌아가기
      </button>

      <div className="mt-3 mb-4 grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={() => prevStudent && navigate(`/students/${prevStudent.id}`)}
          disabled={!prevStudent}
          aria-label="이전 학생 보기"
          className="flex h-10 min-w-10 shrink-0 items-center justify-center gap-1 rounded-lg border border-gray-300 px-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft size={18} />
          <span className="hidden sm:inline">이전 학생</span>
        </button>

        <div className="min-w-0 text-center">
          <h1 className="truncate text-2xl font-bold text-gray-900">
            {student.number}. {student.name}
          </h1>
          <p className="mt-0.5 text-xs text-gray-400">
            {currentIndex + 1} / {students.length}
          </p>
        </div>

        <button
          type="button"
          onClick={() => nextStudent && navigate(`/students/${nextStudent.id}`)}
          disabled={!nextStudent}
          aria-label="다음 학생 보기"
          className="flex h-10 min-w-10 shrink-0 items-center justify-center gap-1 rounded-lg border border-gray-300 px-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <span className="hidden sm:inline">다음 학생</span>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {ATTENDANCE_SUMMARY_LABELS.map((status) => (
          <span
            key={status}
            className={`inline-flex h-[25px] items-center justify-center rounded-full px-2.5 text-[12px] font-semibold ${ATTENDANCE_STATUS_COLOR_CLASS[status]}`}
          >
            {status} {attendanceSummary[status]}
          </span>
        ))}
      </div>

      {studentsError && (
        <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {studentsError}
        </p>
      )}
      {attendanceError && (
        <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {attendanceError}
        </p>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">생활기록 / 상담</h2>
        <button
          onClick={() => {
            setEditingRecord(null)
            setShowRecordForm((v) => !v)
          }}
          className={`inline-flex items-center gap-1.5 ${primaryButtonClass}`}
        >
          <Plus size={16} />
          기록 추가
        </button>
      </div>

      {showRecordForm && (
        <div className={`mb-4 ${sectionCardClass}`}>
          <RecordForm submitLabel="추가" onSubmit={handleAddRecord} onCancel={() => setShowRecordForm(false)} />
        </div>
      )}

      {editingRecord && (
        <div className={`mb-4 ${sectionCardClass}`}>
          <RecordForm
            key={editingRecord.id}
            submitLabel="저장"
            initialValues={editingRecord}
            onSubmit={handleUpdateRecord}
            onCancel={() => setEditingRecord(null)}
          />
        </div>
      )}

      {loading && <p className="text-sm text-gray-500">불러오는 중...</p>}
      {error && (
        <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <RecordTimeline
        records={records}
        loading={loading}
        onEdit={(record) => {
          setShowRecordForm(false)
          setEditingRecord(record)
        }}
        onDelete={deleteRecord}
      />
    </PageContainer>
  )
}
```

(이 새 버전이 이전 버전과 달라진 점: `StudentDetailCard`/`ConfirmDialog`/`StudentFormValues` import 제거, `dangerButtonClass`/`secondaryActiveButtonClass`/`secondaryButtonClass` import 제거, `showDetails`/`detailEditMode`/`detailFormDirty`/`showDeleteConfirm`/`deletingStudent`/`pendingAction` state 전부 제거, `handleUpdateStudent`/`handleDeleteStudent`/`runOrConfirm`/`hasUnsavedChanges` 함수 전부 제거, `DETAIL_PANEL_ID` 상수 제거, `beforeunload` 경고 `useEffect` 제거(미저장 편집 폼이 더는 이 페이지에 없으므로), "상세정보 보기"/"학생 삭제" 버튼과 그 두 확인 다이얼로그 제거, 이전/다음 학생 이동과 목록으로 돌아가기가 `runOrConfirm` 없이 바로 `navigate`를 호출하도록 단순화. `RecordTimeline`에 `loading` prop을 넘기는 부분은 그대로 유지 — 로딩 중 빈 상태 카드가 잘못 뜨는 걸 막기 위해 이미 있던 로직이다.)

- [ ] **Step 2: 더 이상 쓰이지 않는 `StudentDetailCard.tsx` 삭제**

```bash
rm src/components/StudentDetailCard.tsx
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 타입 에러 없이 성공 (다른 어떤 파일도 `StudentDetailCard`를 import하지 않으므로 삭제로 인한 깨짐 없음)

- [ ] **Step 4: 린트 확인**

Run: `npm run lint`
Expected: 통과

- [ ] **Step 5: 전체 테스트 확인**

Run: `npm test`
Expected: 기존 테스트 전부 통과 (라우트/컴포넌트는 자동화 테스트 대상이 아니므로 회귀 확인 목적)

- [ ] **Step 6: 수동 브라우저 확인**

`npm run dev`로 로그인 후 `/students` → "누가기록" 탭에서 학생 카드를 눌러 `/students/:id`로 이동한 뒤:
- "상세정보 보기"와 "학생 삭제" 버튼이 더 이상 보이지 않는지 확인
- 출결 요약 배지(결석/지각/조퇴/결과)와 "생활기록 / 상담" 섹션(기록 추가/수정/삭제, 카테고리 필터)은 기존처럼 정상 동작하는지 확인
- "이전 학생"/"다음 학생" 버튼과 "← 학생 목록으로 돌아가기"가 확인창 없이 바로 이동하는지 확인
- 이 페이지에서 학생을 삭제하고 싶다면 `/students/manage`로 이동해야 함을 확인(Task 1에서 만든 메뉴로 삭제 가능한지 재확인)

- [ ] **Step 7: 커밋**

```bash
git add -A src/routes/StudentDetailPage.tsx src/components/StudentDetailCard.tsx
git commit -m "refactor: remove student delete/detail-view from the class-record detail page"
```

---

### Task 3: 문서 갱신

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: 없음
- Produces: 없음

- [ ] **Step 1: "Roster split" 설명을 새 구조에 맞게 갱신**

`CLAUDE.md`에서 "Roster split — 학급기록 vs 정보관리" 문단 현재:

```
**Roster split — 학급기록 vs 정보관리:** these are two different pages over the same `useStudents()` data, not one page with a mode toggle. `/students` (`StudentListPage`/`StudentListItem`, a dense grid of cards) and `/students/:id` (`StudentDetailPage`) are the read/records-focused pair — both default to showing only 번호/이름, with the other 10 fields hidden until "상세정보 보기" is clicked (a read-only `<dl>` grid); "정보 수정" separately opens the editable `StudentForm`. `/students/manage` (`StudentManagePage`, composed from `components/manage/StudentListCard` + `SchoolSettingsSection`) is the full-CRUD roster admin surface: add/edit/delete one, CSV bulk import/export, bulk delete-all, gender breakdown, and the NEIS school-settings form. When adding a field to `Student`, all three surfaces (`StudentDetailPage`'s read-only block, `StudentForm`, `StudentListCard`) need updating independently — none are derived from one another.
```

다음으로 교체:

```
**Roster split — 학급기록 vs 정보관리:** these are two different pages over the same `useStudents()` data, not one page with a mode toggle. `/students` (`StudentListPage`/`StudentListItem`, a dense grid of cards) and `/students/:id` (`StudentDetailPage`) are the read/records-focused pair — `StudentDetailPage` only shows 번호/이름, an attendance-summary badge row, and the 생활기록/상담 (life-record) timeline; it has no student-info view, edit, or delete affordance of its own. `/students/manage` (`StudentManagePage`, composed from `components/manage/StudentListCard` + `SchoolSettingsSection`) is the single home for all student-info admin actions: view (`StudentDetailModal`, a read-only `<dl>` opened from `StudentRowMenu`'s "상세정보 보기"), edit (`StudentForm`), delete one or all, CSV bulk import/export, gender breakdown, and the NEIS school-settings form. When adding a field to `Student`, two surfaces (`StudentForm`, `StudentDetailModal`) need updating independently — neither is derived from the other.
```

- [ ] **Step 2: 커밋**

```bash
git add CLAUDE.md
git commit -m "docs: update roster split description after moving student detail/delete to 정보관리"
```

## 영향받는 파일

- `src/components/manage/StudentDetailModal.tsx` (신규) — 정보관리용 읽기 전용 학생 상세정보 모달.
- `src/components/manage/StudentRowMenu.tsx` — "상세정보 보기" 메뉴 항목 추가.
- `src/components/manage/StudentListCard.tsx` — 상세정보 모달 상태·연결 추가.
- `src/routes/StudentDetailPage.tsx` — "상세정보 보기"/"학생 삭제"와 관련 상태·확인 다이얼로그 전부 제거.
- `src/components/StudentDetailCard.tsx` — 삭제.
- `CLAUDE.md` — "Roster split" 설명 갱신.

배포에 별도 조치 불필요 — 신규 테이블/컬럼 없음, 스키마 변경 없음.
