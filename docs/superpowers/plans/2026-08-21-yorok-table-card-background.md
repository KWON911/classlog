# 학급요록 표 배경 카드화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학급요록(`/students`, "학급요록" 탭)의 표가 페이지 배경(캔버스색)과 구분되도록, 표 전체를 흰색 카드로 감싼다.

**Architecture:** CSS 전용 수정. `YorokTable.tsx`의 `<table>`을 감싸는 `overflow-x-auto` 래퍼 `<div>`에 카드 스타일(둥근 모서리 + 테두리 + 흰 배경)을 추가한다. 표 안의 개별 데이터 셀(`<td>`)은 대부분 배경색이 지정되어 있지 않아 부모 요소의 배경이 그대로 비쳐 보이므로, 래퍼에 `bg-white`를 주는 것만으로 셀 배경도 함께 흰색으로 보이게 된다 — 셀 하나하나를 고칠 필요가 없다.

**Tech Stack:** React 19 + TypeScript, Tailwind CSS v4 (유틸리티 클래스만 사용, 신규 의존성 없음)

## Global Constraints

- 이 프로젝트의 페이지 배경색은 `src/index.css`의 `--color-canvas: #f2f0eb`이며 `body`에 적용된다 (`page-container`엔 배경이 없음) — 표가 이 색과 시각적으로 구분되지 않는 것이 이번 수정의 근본 원인.
- 이 코드베이스의 기존 "카드" 관례는 `rounded-[14px] border border-gray-200 bg-white` (예: `YorokTable.tsx`의 빈 상태 블록들, `sectionCardClass`) — 새 스타일을 발명하지 말고 이 값을 그대로 사용한다.
- 컬럼 고정(sticky) 동작, 컬럼 추가/삭제/이름변경/드래그 재정렬, 가로 스크롤(`overflow-x-auto`) 동작은 이번 수정으로 바뀌지 않아야 한다 — 순수 배경색 변경.

---

### Task 1: 표 래퍼에 카드 배경 적용

**Files:**
- Modify: `src/components/yorok/YorokTable.tsx:187` (표를 감싸는 `<div className="mt-3 overflow-x-auto">`)

**Interfaces:**
- Consumes: 없음 (기존 컴포넌트 내부 클래스 수정)
- Produces: 없음 (외부에서 참조하는 새 함수/타입 없음)

- [ ] **Step 1: 표 래퍼 `<div>`에 카드 스타일 클래스 추가**

`src/components/yorok/YorokTable.tsx`에서 현재:

```tsx
          <div className="mt-3 overflow-x-auto">
            <table className="border-collapse text-sm">
```

다음으로 변경:

```tsx
          <div className="mt-3 overflow-x-auto rounded-[14px] border border-gray-200 bg-white">
            <table className="border-collapse text-sm">
```

(닫는 `</div>`는 그대로 유지 — 클래스만 추가되는 변경이라 JSX 구조는 바뀌지 않는다.)

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 타입 에러 없이 성공 (JSX 구조 변경이 없으므로 로직 관련 실패는 없어야 함)

- [ ] **Step 3: 린트 확인**

Run: `npm run lint`
Expected: 통과

- [ ] **Step 4: 자동화 테스트 확인**

Run: `npm test`
Expected: 기존 204개 테스트 전부 통과 (컴포넌트는 자동화 테스트 대상이 아니므로 회귀 확인 목적)

- [ ] **Step 5: 수동 브라우저 확인**

`npm run dev`로 로그인 후 `/students` → "학급요록" 탭에서:
- 표 전체가 둥근 모서리의 흰 카드로 페이지 배경(연한 베이지색)과 뚜렷하게 구분되는지 확인
- 컬럼이 1개뿐이어서 표가 좁을 때도(최근 너비 축소 수정 이후 상태) 카드 경계가 표 내용 크기에 맞게 표시되는지 확인 (표 전체 너비로 늘어나지 않는지)
- 컬럼을 여러 개 추가해 가로 스크롤이 생겼을 때, 스크롤해도 카드 테두리/배경이 깨지지 않는지 확인
- 학생 이름(고정) 컬럼이 스크롤 시에도 여전히 고정되고 흰 배경으로 잘 보이는지 확인
- 컬럼 헤더 드래그 재정렬, 이름 수정(연필 아이콘), 삭제(X 버튼) 등 기존 기능이 카드 스타일 적용 후에도 정상 동작하는지 확인

- [ ] **Step 6: 커밋**

```bash
git add src/components/yorok/YorokTable.tsx
git commit -m "fix: wrap yorok table in a white card to separate it from the page background"
```

## 영향받는 파일

- `src/components/yorok/YorokTable.tsx` — 표 래퍼 `<div>`에 카드 배경 클래스 3개(`rounded-[14px] border border-gray-200 bg-white`) 추가. 그 외 파일 변경 없음.
