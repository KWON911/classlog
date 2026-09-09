# 학생 상세 패널 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학생 명단 칩을 선택하면 상세정보를 같은 화면에서 확인하고, 그 패널에서 수정·삭제할 수 있게 한다.

**Architecture:** `StudentListCard`가 선택 학생 상태와 기존 수정·삭제 상태를 관리한다. 재사용 가능한 상세정보 본문을 데스크톱의 오른쪽 패널과 좁은 화면의 모달에 표시하며, 기존 `StudentForm`과 `ConfirmDialog`로 변경·삭제를 수행한다.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest, Testing Library

## Global Constraints

- 기존 학생 데이터·조회·수정·삭제 훅과 Supabase 접근 경계는 변경하지 않는다.
- 수정·삭제는 기존 `StudentForm`, `ConfirmDialog`, mutation 콜백을 재사용한다.
- 모바일에서는 학생 선택 시 모달을 사용해 목록 폭을 유지한다.
- CSV 가져오기·내보내기, 개별 추가, 로딩·빈 상태·오류 상태는 변경하지 않는다.

---

### Task 1: 상세정보 표현과 선택 흐름

**Files:**
- Modify: `src/components/manage/StudentDetailModal.tsx`
- Modify: `src/components/manage/StudentListCard.tsx`
- Test: `src/components/manage/StudentListCard.test.tsx`

**Interfaces:**
- Consumes: `Student`, `Modal`, `StudentListCard`의 `updateStudent`와 `deleteStudent` 콜백.
- Produces: `StudentDetailModal`의 선택적 `onEdit`, `onDelete` 콜백과 `StudentListCard`의 선택형 상세 UI.

- [x] **Step 1: 선택 학생과 상세 제어를 검증하는 실패 테스트를 작성한다.**

```tsx
await user.click(screen.getByRole('button', { name: '1번 김민서 상세정보 보기' }))

expect(screen.getByText('학생 상세정보')).toBeInTheDocument()
expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument()
expect(screen.getByRole('button', { name: '학생 삭제' })).toBeInTheDocument()
expect(screen.queryByLabelText('김민서 학생 관리 메뉴')).not.toBeInTheDocument()
```

- [x] **Step 2: 대상 테스트가 현재 관리 메뉴 의존 때문에 실패하는지 확인한다.**

Run: `npm test -- src/components/manage/StudentListCard.test.tsx`

Expected: FAIL because the row is not a selectable student button and the detail view has no action buttons.

- [x] **Step 3: 선택형 상세 UI를 최소 구현한다.**

```tsx
const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

<button type="button" aria-label={`${student.number}번 ${student.name} 상세정보 보기`} onClick={() => setSelectedStudent(student)}>
  {/* 번호, 이름, 성별 */}
</button>
```

- 데스크톱에서는 학생 칩 목록과 `StudentDetailModal`의 상세 본문을 나란히 표시한다.
- 좁은 화면에서는 선택 시 기존 `Modal` 안에 같은 상세 본문을 연다.
- 상세정보에 `수정`과 `학생 삭제` 버튼을 연결하고, 기존 `StudentRowMenu` 렌더링과 `viewingStudent` 상태를 제거한다.
- 수정 성공 시 선택 학생 정보는 갱신된 `students` 배열에서 다시 찾아 표시하고, 삭제 확인 후에는 선택 상태를 해제한다.

- [x] **Step 4: 대상 테스트를 다시 실행한다.**

Run: `npm test -- src/components/manage/StudentListCard.test.tsx`

Expected: PASS.

### Task 2: 회귀 검증과 문서 확인

**Files:**
- Modify: `docs/superpowers/specs/2026-09-09-student-detail-panel-design.md`
- Modify: `docs/superpowers/plans/2026-09-09-student-detail-panel.md`

**Interfaces:**
- Consumes: Task 1의 선택형 상세정보 UI.
- Produces: 검증 완료 상태의 명세와 계획.

- [x] **Step 1: TypeScript, lint, production build를 실행한다.**

Run: `npm run lint; npm run build`

Expected: both commands exit with code 0.

- [x] **Step 2: 변경 목록과 공백 오류를 확인한다.**

Run: `git diff --check; git status --short`

Expected: StudentListCard, StudentDetailModal, 대상 테스트, 설계 문서와 계획 문서만 변경으로 표시된다.

- [x] **Step 3: 계획 체크박스를 완료 상태로 갱신한다.**

```markdown
- [x] **Step 4: 대상 테스트를 다시 실행한다.**
```
