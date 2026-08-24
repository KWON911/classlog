---
render_with_liquid: false
---

# 학급요록 학생 이름 컬럼 고정 너비 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학급요록(`/students` → "학급요록" 탭) 표에서 학생 이름 열이 컬럼이 적을 때 지나치게 넓어지는 문제를 고정 너비로 고정한다.

**Architecture:** `YorokTable.tsx`의 학생 이름 `<th>`/`<td>` 두 곳의 Tailwind 클래스만 수정하는 순수 CSS 변경 — 로직/데이터/훅 변경 없음.

**Tech Stack:** React 19 + Tailwind CSS v4 (기존 코드베이스 그대로).

## Global Constraints

- 컴포넌트 파일이라 자동화 테스트 대상 아님(CLAUDE.md 컨벤션) — `npm run build` + `npm run lint` + 수동 브라우저 확인으로 검증.
- 다른 컬럼(교사가 추가하는 텍스트/체크박스 컬럼, `min-w-[220px]`)의 기존 동작에는 영향을 주지 않는다.
- sticky 동작(`sticky left-0 z-10`)은 유지한다.

---

## 원인

`src/components/yorok/YorokTable.tsx`의 학생 이름 헤더/셀에 `min-w-[140px]`만 지정되어 있고 최대 너비 제한이 없다:

```
th (line 191): className="sticky left-0 z-10 min-w-[140px] border-b border-gray-200 bg-white px-3 py-2 text-left font-semibold text-gray-700"
td (line 258): className="sticky left-0 z-10 border-b border-gray-100 bg-white px-3 py-2 font-medium text-gray-900"
```

`<table>`은 `min-w-full`이라 부모 컨테이너 폭을 채우려 하는데, 교사가 추가한 컬럼 수가 적을 때(예: 1~2개) 남는 여유 공간을 첫 번째 열(학생 이름)이 전부 흡수해서 이름 칸이 비정상적으로 넓어진다.

## 해결 방향

`min-w-[140px]`(최소 너비만 지정)를 `w-[140px] max-w-[140px]`(고정 너비 + 최대 너비 상한)로 바꿔 이름 칸이 남는 공간을 흡수하지 못하게 한다. 이름이 칸보다 길 경우를 대비해 `truncate` 클래스로 말줄임 처리하고, 전체 이름을 `title` 속성으로 hover 시 볼 수 있게 한다.

---

## Task 1: 학생 이름 컬럼 고정 너비 적용

**Files:**
- Modify: `src/components/yorok/YorokTable.tsx:191` (헤더 `<th>`)
- Modify: `src/components/yorok/YorokTable.tsx:258-260` (본문 `<td>`)

**Interfaces:**
- Consumes: 없음 (이 파일 내부 마크업만 수정)
- Produces: 없음 (외부에 영향 주는 인터페이스 변경 없음)

- [ ] **Step 1: 헤더 `<th>` 클래스 수정**

`src/components/yorok/YorokTable.tsx`에서 다음을 찾는다:

```tsx
                  <th className="sticky left-0 z-10 min-w-[140px] border-b border-gray-200 bg-white px-3 py-2 text-left font-semibold text-gray-700">
                    학생
                  </th>
```

다음으로 교체:

```tsx
                  <th className="sticky left-0 z-10 w-[140px] max-w-[140px] border-b border-gray-200 bg-white px-3 py-2 text-left font-semibold text-gray-700">
                    학생
                  </th>
```

(`min-w-[140px]` → `w-[140px] max-w-[140px]`로만 변경, 나머지 클래스는 그대로.)

- [ ] **Step 2: 본문 `<td>` 클래스 및 마크업 수정 (고정폭 + 말줄임)**

다음을 찾는다:

```tsx
                    <td className="sticky left-0 z-10 border-b border-gray-100 bg-white px-3 py-2 font-medium text-gray-900">
                      {student.number}번 {student.name}
                    </td>
```

다음으로 교체:

```tsx
                    <td
                      className="sticky left-0 z-10 w-[140px] max-w-[140px] truncate border-b border-gray-100 bg-white px-3 py-2 font-medium text-gray-900"
                      title={`${student.number}번 ${student.name}`}
                    >
                      {student.number}번 {student.name}
                    </td>
```

(`w-[140px] max-w-[140px] truncate` 클래스 추가 + `title` 속성으로 전체 텍스트를 hover 시 확인 가능하게.)

- [ ] **Step 3: 빌드/린트로 타입·문법 에러 없는지 확인**

Run: `npm run build`
Expected: 에러 없이 성공

Run: `npm run lint`
Expected: 에러 없이 성공

- [ ] **Step 4: 전체 테스트 스위트로 회귀 확인**

Run: `npm test`
Expected: 기존 204개 테스트 모두 통과 (이 컴포넌트는 테스트 대상 아니므로 개수 변화 없어야 함)

- [ ] **Step 5: 브라우저에서 수동 확인**

`npm run dev` → 로그인 → `/students` → "학급요록" 탭에서:
- 컬럼이 1~2개뿐일 때도 학생 이름 칸이 좁게(140px 고정) 유지되는지 확인
- 컬럼을 여러 개 추가해 가로 스크롤이 생겨도 이름 칸 폭이 그대로인지, sticky(고정) 동작이 여전히 되는지 확인
- 이름이 긴 학생(4글자 이상)의 경우 말줄임(...) 처리되고, 마우스를 올리면 전체 이름이 툴팁으로 뜨는지 확인
- 다른 컬럼(텍스트/체크박스)의 폭과 편집 동작에는 변화가 없는지 확인

- [ ] **Step 6: 커밋**

```bash
git add src/components/yorok/YorokTable.tsx
git commit -m "fix: pin 학급요록 student name column to a fixed width"
```
