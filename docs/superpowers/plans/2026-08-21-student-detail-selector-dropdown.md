---
render_with_liquid: false
---

# 학생 상세 페이지 선택 드롭다운 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학급기록 학생 상세 페이지(`/students/:id`)에서 이름 양옆의 "이전 학생"/"다음 학생" 버튼을 제거하고, 학생 이름 자리 자체를 드롭다운(`<select>`)으로 바꿔 전체 학생 목록 중 아무나 바로 선택해 이동할 수 있게 한다.

**Architecture:** 순수 UI 변경. `StudentDetailPage.tsx`의 현재 3열 그리드(이전 버튼 / 이름 / 다음 버튼)를 없애고, 그 자리에 큰 제목처럼 보이도록 스타일링한 `<select>` 하나를 둔다. `<select>`의 `value`는 현재 학생 id, `onChange`는 선택된 학생의 상세 페이지로 `navigate`한다. 옵션 목록은 이미 로드되어 있는 `students`(번호순 정렬은 `useStudents` 훅이 이미 보장)를 그대로 순회해서 만든다 — 새 데이터 조회 없음.

**Tech Stack:** React 19 + TypeScript, React Router 7, Tailwind CSS v4, lucide-react (신규 의존성 없음)

## Global Constraints

- `useStudents()`가 반환하는 `students` 배열은 이미 `number` 오름차순으로 정렬되어 있다(훅 내부에서 merge 후 재정렬) — 드롭다운 옵션도 별도 정렬 없이 그 순서를 그대로 쓴다.
- 드롭다운은 이 코드베이스의 다른 `<select>`들(`SchoolSettingsSection.tsx`의 학년 선택 등)과 달리 폼 입력이 아니라 "제목처럼 보이는 내비게이션 컨트롤"이다 — 기존 `fieldClass`(작은 폼 필드 스타일)를 쓰지 않고, 지금 있던 `<h1 className="text-2xl font-bold text-gray-900">`와 시각적으로 동일한 크기·굵기·색으로 직접 스타일링한다. 드롭다운임을 알아볼 수 있도록 오른쪽에 작은 셰브론(chevron-down) 아이콘을 얹는다.
- "N / 전체명수" 카운터 텍스트(`{currentIndex + 1} / {students.length}`)는 그대로 유지한다 — 이번 변경은 이동 방식만 바꾸는 것이지 이 정보 표시를 없애는 게 아니다.
- 학생을 선택하면 `navigate(`/students/${선택된id}`)`로 이동한다 — 기존 이전/다음 버튼이 쓰던 것과 동일한 네비게이션 방식(뒤로가기 스택에 남는 일반 push, `replace` 아님).
- `StudentDetailPage.tsx`는 라우트라 이 프로젝트의 자동화 테스트 대상이 아니다 — `npm run build` + `npm run lint` + 수동 스모크로 검증한다.

---

### Task 1: 이전/다음 버튼을 학생 선택 드롭다운으로 교체

**Files:**
- Modify: `src/routes/StudentDetailPage.tsx`

**Interfaces:**
- Consumes: 없음 (기존 컴포넌트 내부의 `students`, `student`, `currentIndex`, `navigate`만 사용)
- Produces: 없음

- [ ] **Step 1: import 정리 — `ChevronLeft`/`ChevronRight`를 `ChevronDown`으로 교체**

`src/routes/StudentDetailPage.tsx` 현재:

```tsx
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
```

다음으로 변경:

```tsx
import { ChevronDown, Plus } from 'lucide-react'
```

- [ ] **Step 2: 더 이상 쓰이지 않는 `prevStudent`/`nextStudent` 변수 제거**

현재:

```tsx
  const student = students.find((s) => s.id === id)
  const currentIndex = students.findIndex((s) => s.id === id)
  const prevStudent = currentIndex > 0 ? students[currentIndex - 1] : null
  const nextStudent = currentIndex >= 0 && currentIndex < students.length - 1 ? students[currentIndex + 1] : null
```

다음으로 변경:

```tsx
  const student = students.find((s) => s.id === id)
  const currentIndex = students.findIndex((s) => s.id === id)
```

- [ ] **Step 3: 이전/다음 버튼이 있던 3열 그리드를 학생 선택 드롭다운으로 교체**

현재:

```tsx
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
```

다음으로 변경:

```tsx
      <div className="mt-3 mb-4 flex flex-col items-center gap-1">
        <div className="relative inline-block max-w-full">
          <select
            value={student.id}
            onChange={(e) => navigate(`/students/${e.target.value}`)}
            aria-label="학생 선택"
            className="w-full appearance-none truncate rounded-lg bg-transparent py-1 pl-8 pr-8 text-center text-2xl font-bold text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.number}. {s.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={20}
            aria-hidden="true"
            className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </div>
        <p className="text-xs text-gray-400">
          {currentIndex + 1} / {students.length}
        </p>
      </div>
```

(`pl-8`/`pr-8`로 좌우 여백을 동일하게 줘서 오른쪽 셰브론 아이콘이 있어도 텍스트가 실제로 가운데 정렬되어 보이게 한다. `appearance-none`으로 브라우저 기본 드롭다운 화살표를 지우고 커스텀 셰브론 아이콘만 남긴다.)

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 타입 에러 없이 성공

- [ ] **Step 5: 린트 확인**

Run: `npm run lint`
Expected: 통과

- [ ] **Step 6: 전체 테스트 확인**

Run: `npm test`
Expected: 기존 테스트 전부 통과 (라우트는 자동화 테스트 대상이 아니므로 회귀 확인 목적)

- [ ] **Step 7: 수동 브라우저 확인**

`npm run dev`로 로그인 후 `/students` → "누가기록" 탭에서 학생 카드를 눌러 `/students/:id`로 이동한 뒤:
- "이전 학생"/"다음 학생" 버튼이 더 이상 보이지 않는지 확인
- 학생 이름이 있던 자리가 큰 제목처럼 보이는 드롭다운으로 바뀌었는지, 오른쪽에 작은 화살표(chevron) 아이콘이 있는지 확인
- 드롭다운을 클릭해 전체 학생 목록이 번호순으로 뜨는지 확인
- 목록 중 인접하지 않은 학생(예: 맨 마지막 학생)을 선택 → 해당 학생의 상세 페이지(출결 요약, 생활기록)로 즉시 이동하는지, "N / 전체명수" 카운터가 올바르게 갱신되는지 확인
- 이름이 긴 학생을 선택했을 때 드롭다운 텍스트가 잘리지 않고 잘 보이는지(또는 `truncate`로 자연스럽게 잘리는지) 확인
- "← 학생 목록으로 돌아가기"는 기존처럼 정상 동작하는지 확인(회귀 없음)

- [ ] **Step 8: 커밋**

```bash
git add src/routes/StudentDetailPage.tsx
git commit -m "feat: replace prev/next student buttons with a selector dropdown"
```

## 영향받는 파일

- `src/routes/StudentDetailPage.tsx` — 이전/다음 버튼 제거, 학생 선택 드롭다운 추가.

배포에 별도 조치 불필요 — 데이터/스키마 변경 없음.
