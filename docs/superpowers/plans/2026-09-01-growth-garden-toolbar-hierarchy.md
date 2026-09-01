# 성장정원 제어 영역 위계·정렬 통일 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 성장정원 모든 페이지의 이동, 화면 제어, 콘텐츠 동작 버튼을 같은 행·좌우 정렬 규칙으로 배치한다.

**Architecture:** 기존 `GardenPageNav`, `SegmentedGroup`, `SegmentedButton`을 재사용한다. 각 라우트의 제어 영역은 공통 이동 행과 화면별 제어 행으로 나누며, 성장 데이터와 서비스는 수정하지 않는다.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, React Router, Vitest, Testing Library

## Global Constraints

- 성장 기록·점수·꽃·리포트 계산, Supabase 서비스와 migration을 수정하지 않는다.
- 공통 이동은 데스크톱 첫 행의 왼쪽, 즉시 주 동작은 같은 행 오른쪽에 둔다.
- 필터·정렬·보기 전환은 별도 화면 제어 행 왼쪽에 둔다.
- 모바일은 이동, 주 동작, 화면 제어를 독립 행으로 둔다.
- 초기화·삭제는 해당 콘텐츠 카드 내부에 유지하고 새 의존성을 추가하지 않는다.

---

## File Structure

- Modify: `src/components/growth-garden/GrowthGardenBoard.tsx` — 정원 목록의 이동/주 동작/표시 제어 행을 고정한다.
- Modify: `src/components/growth-garden/GrowthGardenBoard.test.tsx` — 카드/정원 전환의 행 위치 회귀를 검증한다.
- Modify: `src/routes/GrowthGardenReportPage.tsx` — 이동 행과 월/학급·개인 제어 행을 명시한다.
- Create: `src/routes/GrowthGardenReportPage.test.tsx` — 리포트 제어 순서와 행을 검증한다.
- Modify: `src/routes/GrowthGardenSettingsPage.tsx` — 제목과 공통 이동 행을 분리한다.
- Create: `src/routes/GrowthGardenSettingsPage.test.tsx` — 설정 이동과 카드 내부 저장 동작을 검증한다.
- Modify: `src/routes/GrowthGardenStudentPage.tsx` — 돌아가기, 상점·벌점, 기록 보조 동작의 구역을 명확히 한다.
- Create: `src/routes/GrowthGardenStudentPage.test.tsx` — 개인 화면 주/보조 동작 구분을 검증한다.
- Modify: `src/components/growth-garden/ClassGardenSummary.tsx` — 전체화면 동작을 장면 제목 행의 우측 끝에 고정한다.
- Create: `src/components/growth-garden/ClassGardenSummary.test.tsx` — 장면 우측 동작 영역을 검증한다.
- Modify: `src/components/growth-garden/awards/MonthlyAwardCelebration.tsx` — 전체화면/닫기를 우측 상단 보조 동작 묶음으로 유지한다.

### Task 1: 정원 목록 제어 행을 상태와 무관하게 고정

**Files:**
- Modify: `src/components/growth-garden/GrowthGardenBoard.tsx:123-157`
- Modify: `src/components/growth-garden/GrowthGardenBoard.test.tsx`

**Interfaces:**
- Consumes: `GardenPageNav`, `SelectionToolbar`, `SegmentedGroup`, `SegmentedButton`, `useStudentSelection`.
- Produces: 카드/정원 보기 전환과 선택 모드 진입 전에도 같은 행 구조를 유지하는 목록 툴바.

- [ ] **Step 1: 실패하는 카드/정원 전환 회귀 테스트를 작성한다.**

```tsx
it('keeps display controls in the second full row in card and garden views', () => {
  renderBoard()
  expect(screen.getByRole('group', { name: '정렬 기준' }).parentElement).toHaveClass('w-full')
  fireEvent.click(screen.getByRole('button', { name: '정원 보기' }))
  expect(screen.getByRole('group', { name: '정렬 기준' }).parentElement).toHaveClass('w-full')
})
```

- [ ] **Step 2: 테스트가 현재 행 계약의 누락으로 실패하는지 확인한다.**

Run: `npm test -- src/components/growth-garden/GrowthGardenBoard.test.tsx`

Expected: 새 행 식별자 또는 독립 행 클래스가 없어 FAIL.

- [ ] **Step 3: 공통 이동/주 동작 행과 표시 제어 행을 분리한다.**

```tsx
<div className="mb-4 space-y-2">
  <div className="flex min-h-9 flex-wrap items-center gap-2">
    <GardenPageNav />
    {viewMode === 'card' && !selection.active && (
      <div className="ml-auto"><SelectionToolbar classSize={students.length} onEnter={selection.enter} /></div>
    )}
  </div>
  {!selection.active && (
    <div className="flex w-full flex-nowrap items-center gap-2">
      <SegmentedGroup label="정렬 기준">
        <SegmentedButton active={sortMode === 'number'} onClick={() => setSortMode('number')}>번호순</SegmentedButton>
        <SegmentedButton active={sortMode === 'score'} onClick={() => setSortMode('score')}>점수순</SegmentedButton>
      </SegmentedGroup>
      <SegmentedGroup label="보기 모드">
        <SegmentedButton active={viewMode === 'card'} onClick={() => setViewMode('card')}>카드 보기</SegmentedButton>
        <SegmentedButton active={viewMode === 'garden'} onClick={() => setViewMode('garden')}>정원 보기</SegmentedButton>
      </SegmentedGroup>
    </div>
  )}
</div>
```

모바일에서는 주 동작에 `basis-full`을 적용해 독립 행으로 내리고, 정렬·보기 묶음은 같은 표시 제어 행에 남긴다.

- [ ] **Step 4: 관련 테스트를 통과시킨다.**

Run: `npm test -- src/components/growth-garden/GrowthGardenBoard.test.tsx`

Expected: PASS.

- [ ] **Step 5: 목록 변경을 커밋한다.**

Run: `git add src/components/growth-garden/GrowthGardenBoard.tsx src/components/growth-garden/GrowthGardenBoard.test.tsx`

Run: `git commit -m "fix: 성장정원 목록 제어 행 통일"`

### Task 2: 월별 리포트의 이동·기간·대상 제어 행을 명시

**Files:**
- Modify: `src/routes/GrowthGardenReportPage.tsx:87-102`
- Create: `src/routes/GrowthGardenReportPage.test.tsx`

**Interfaces:**
- Consumes: `GardenPageNav`, `MonthSelector`, `SegmentedGroup`, `SegmentedButton`.
- Produces: 첫 행의 공통 이동과 둘째 행의 `월 선택 → 학급 | 개인` 순서를 보장하는 리포트 헤더.

- [ ] **Step 1: 실패하는 제어 순서 테스트를 작성한다.**

```tsx
it('places month selection before report type controls in the second toolbar row', () => {
  renderReportPage()
  const monthControl = screen.getByLabelText('월 선택')
  const reportType = screen.getByRole('group', { name: '리포트 종류' })
  expect(monthControl.compareDocumentPosition(reportType) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(reportType.parentElement).toHaveClass('w-full')
})
```

`useStudents`, `useMonthlyReport`, `useRewards`, `useMonthlyAwards`는 완전한 반환 shape으로 mock하고, `GardenPageNav`, `MonthSelector`, `SegmentedGroup`은 실제 컴포넌트를 쓴다.

- [ ] **Step 2: 테스트가 제어 행 계약 누락으로 실패하는지 확인한다.**

Run: `npm test -- src/routes/GrowthGardenReportPage.test.tsx`

Expected: `w-full` 제어 행이 없어 FAIL.

- [ ] **Step 3: 리포트 헤더를 두 행으로 구현한다.**

```tsx
<div className="mb-4 space-y-2">
  <div className="flex min-h-9 items-center"><GardenPageNav /></div>
  <div className="flex w-full flex-wrap items-center gap-2">
    <MonthSelector value={yearMonth} onChange={setYearMonth} />
    <SegmentedGroup label="리포트 종류">
      <SegmentedButton active={tab === 'class'} onClick={() => setTab('class')}>학급</SegmentedButton>
      <SegmentedButton active={tab === 'student'} onClick={() => setTab('student')}>개인</SegmentedButton>
    </SegmentedGroup>
  </div>
</div>
```

- [ ] **Step 4: 테스트를 통과시킨다.**

Run: `npm test -- src/routes/GrowthGardenReportPage.test.tsx`

Expected: PASS.

- [ ] **Step 5: 리포트 변경을 커밋한다.**

Run: `git add src/routes/GrowthGardenReportPage.tsx src/routes/GrowthGardenReportPage.test.tsx`

Run: `git commit -m "fix: 성장 리포트 제어 행 정렬"`

### Task 3: 설정과 개인 성장 화면의 제어 위계를 명확히 한다

**Files:**
- Modify: `src/routes/GrowthGardenSettingsPage.tsx:87-97`
- Create: `src/routes/GrowthGardenSettingsPage.test.tsx`
- Modify: `src/routes/GrowthGardenStudentPage.tsx:76-147`
- Create: `src/routes/GrowthGardenStudentPage.test.tsx`

**Interfaces:**
- Consumes: `GardenPageNav`, `ThresholdEditor`, `PointActionButtons`, `GrowthLogTimeline`.
- Produces: 설정의 독립 이동 행과 개인 화면의 돌아가기/상점·벌점/기록 보조 동작 구역.

- [ ] **Step 1: 실패하는 설정 제어 위계 테스트를 작성한다.**

```tsx
it('keeps shared garden navigation above threshold editor actions', () => {
  renderSettingsPage()
  const navigation = screen.getByRole('link', { name: '정원' }).parentElement
  const saveButton = screen.getAllByRole('button', { name: '저장' })[0]
  expect(navigation?.compareDocumentPosition(saveButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})
```

- [ ] **Step 2: 실패하는 개인 화면 주·보조 동작 테스트를 작성한다.**

```tsx
it('separates point actions from record reset actions', () => {
  renderStudentPage()
  expect(screen.getByRole('link', { name: '학급 성장정원' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /상점/ })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /벌점/ })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '전체 초기화' })).toBeInTheDocument()
})
```

- [ ] **Step 3: 두 테스트가 새 제어 구역 식별자 없이 실패하는지 확인한다.**

Run: `npm test -- src/routes/GrowthGardenSettingsPage.test.tsx src/routes/GrowthGardenStudentPage.test.tsx`

Expected: 새 레이아웃 계약이 없어 FAIL.

- [ ] **Step 4: 설정과 개인 화면의 최소 레이아웃을 구현한다.**

```tsx
// GrowthGardenSettingsPage
<div className="mb-4"><h1>성장 기준 설정</h1><p>단계 이름은 그대로 두고 기준 점수만 학급에 맞게 조정합니다.</p></div>
<div className="mb-4 flex min-h-9 items-center"><GardenPageNav /></div>

// GrowthGardenStudentPage
<header className="mb-4"><Link to="/growth-garden">학급 성장정원</Link></header>
<div className="mt-4 w-full" aria-label="성장 포인트 기록">
  <PointActionButtons studentName={student.name} saving={isSaving(studentId)} onRequest={recorder.open} />
</div>
```

`ThresholdEditor`의 기본값 복원 왼쪽·저장 오른쪽, 최근 기록 카드 안의 전체 초기화는 그대로 유지한다.

- [ ] **Step 5: 설정·개인 화면 테스트를 통과시킨다.**

Run: `npm test -- src/routes/GrowthGardenSettingsPage.test.tsx src/routes/GrowthGardenStudentPage.test.tsx`

Expected: PASS.

- [ ] **Step 6: 설정·개인 화면 변경을 커밋한다.**

Run: `git add src/routes/GrowthGardenSettingsPage.tsx src/routes/GrowthGardenSettingsPage.test.tsx src/routes/GrowthGardenStudentPage.tsx src/routes/GrowthGardenStudentPage.test.tsx`

Run: `git commit -m "fix: 성장정원 설정과 개인 화면 제어 위계"`

### Task 4: 전체화면 장면의 우측 보조 동작을 안정화

**Files:**
- Modify: `src/components/growth-garden/ClassGardenSummary.tsx:24-65`
- Create: `src/components/growth-garden/ClassGardenSummary.test.tsx`
- Modify: `src/components/growth-garden/awards/MonthlyAwardCelebration.tsx:168-191`

**Interfaces:**
- Consumes: `ClassGardenSummary.action`, `useFullscreen`, `MonthlyAwardCelebration.onClose`.
- Produces: 전체화면 관련 보조 동작이 일반 툴바와 섞이지 않는 장면별 우측 정렬.

- [ ] **Step 1: 실패하는 장면 우측 동작 영역 테스트를 작성한다.**

```tsx
it('keeps the supplied scene action in the summary action region', () => {
  render(<ClassGardenSummary environment={environment} action={<button>전체화면 보기</button>} />)
  expect(screen.getByRole('button', { name: '전체화면 보기' }).parentElement).toHaveClass('ml-auto')
})
```

- [ ] **Step 2: 테스트가 우측 정렬 계약 누락을 보여 주는지 확인한다.**

Run: `npm test -- src/components/growth-garden/ClassGardenSummary.test.tsx`

Expected: 장면 동작 영역 식별자 또는 `shrink-0` 보장이 없어 FAIL.

- [ ] **Step 3: 전체화면·축하 보조 동작을 최소 변경으로 고정한다.**

```tsx
{action && <div className="ml-auto shrink-0" data-testid="garden-scene-action">{action}</div>}
<div className="absolute right-4 top-4 z-40 flex items-center gap-2" aria-label="축하 화면 제어">
  <button type="button" onClick={toggle}>전체화면</button>
  <button type="button" onClick={onClose} aria-label="축하 화면 닫기">닫기</button>
</div>
```

전체화면/닫기 버튼의 순서와 ESC 동작은 변경하지 않는다.

- [ ] **Step 4: 장면 테스트를 통과시킨다.**

Run: `npm test -- src/components/growth-garden/ClassGardenSummary.test.tsx`

Expected: PASS.

- [ ] **Step 5: 전체화면 장면 변경을 커밋한다.**

Run: `git add src/components/growth-garden/ClassGardenSummary.tsx src/components/growth-garden/ClassGardenSummary.test.tsx src/components/growth-garden/awards/MonthlyAwardCelebration.tsx`

Run: `git commit -m "fix: 성장정원 전체화면 제어 정렬"`

### Task 5: 통합 검증과 반응형 수동 점검

**Files:**
- Modify: 앞선 작업에서 수동 점검 결과가 요구할 때만 관련 파일을 최소 수정한다.

**Interfaces:**
- Consumes: Tasks 1-4의 성장정원 제어 컴포넌트.
- Produces: 데스크톱과 모바일에서 일관된 성장정원 제어 위계를 갖는 배포 가능 상태.

- [ ] **Step 1: 성장정원 제어 테스트를 함께 실행한다.**

Run: `npm test -- src/components/growth-garden/GrowthGardenBoard.test.tsx src/routes/GrowthGardenReportPage.test.tsx src/routes/GrowthGardenSettingsPage.test.tsx src/routes/GrowthGardenStudentPage.test.tsx src/components/growth-garden/ClassGardenSummary.test.tsx`

Expected: PASS.

- [ ] **Step 2: 브라우저에서 데스크톱과 390px 모바일 폭을 점검한다.**

```text
정원: 이동 왼쪽, 학생 선택 주 동작, 정렬·보기 별도 행
리포트: 이동 첫 행, 월 선택 → 학급/개인 둘째 행
설정: 제목 뒤 이동 행, 카드 내부 기본값 복원 왼쪽·저장 오른쪽
개인: 돌아가기 상단, 상점·벌점 상태 카드 안, 초기화 최근 기록 카드 안
전체화면/축하: 장면 우측 보조 동작 묶음
```

- [ ] **Step 3: 전체 정적 검증을 실행한다.**

Run: `npm run lint && npm run build && npm test`

Expected: 세 명령 모두 exit code 0. Vite 청크 크기 경고는 오류가 아니므로 별도 변경하지 않는다.

- [ ] **Step 4: 커밋 범위와 작업 트리를 확인한다.**

Run: `git status -sb`

Expected: Tasks 1-4의 커밋 외에는 사용자 소유 파일과 의도한 문서 변경만 남아 있다.

## Self-Review

- Spec coverage: 공통 이동, 데스크톱/모바일 행 정렬, 정원 목록, 리포트, 설정, 개인 화면, 전체화면/축하 장면, 위험 동작 유지, 접근성, 반응형·정적 검증을 Tasks 1-5에 각각 배정했다.
- Placeholder scan: `TBD`, `TODO`, 추후 구현 지시를 포함하지 않는다.
- Type consistency: 새 데이터 타입·서비스 인터페이스를 만들지 않고 기존 컴포넌트 props와 훅을 유지한다.
