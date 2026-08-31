# 성장정원 월별 리포트 제어부 배치 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 월별 리포트에서 월 선택을 먼저, 학급/개인 탭을 그 오른쪽에 두는 두 줄 제어부를 만든다.

**Architecture:** `GrowthGardenReportPage`의 제어부 마크업만 두 개의 flex 행으로 나눈다. `MonthSelector`와 `SegmentedGroup`의 props와 상태는 그대로 두므로 리포트 데이터 흐름은 바뀌지 않는다.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Vite, Vitest, oxlint

## Global Constraints

- 첫째 줄에는 `GardenPageNav`만 둔다.
- 둘째 줄은 `MonthSelector` 다음 `SegmentedGroup` 순서로 둔다.
- 선택 월, 선택 리포트 탭, 월 선택 팝오버와 접근성 라벨은 바꾸지 않는다.
- 이 프로젝트는 UI 컴포넌트 테스트 대신 프로덕션 빌드·린트·브라우저 수동 검증을 사용한다.

---

### Task 1: 월별 리포트 제어부 두 줄 배치

**Files:**
- Modify: `src/routes/GrowthGardenReportPage.tsx:110-122`

**Interfaces:**
- Consumes: `GardenPageNav`, `MonthSelector`, `SegmentedGroup`, `SegmentedButton`의 현재 props
- Produces: 동일한 리포트 상태와 이벤트 핸들러를 유지한 두 줄 제어부

- [ ] **Step 1: 수정 전 배치 확인**

로컬 `/growth-garden/report` 화면에서 `GardenPageNav`, 학급/개인 탭, `MonthSelector`가 하나의 컨테이너에 있고 탭이 월 선택보다 앞에 있는지 확인한다.

- [ ] **Step 2: 제어부를 두 개의 행으로 나눈다**

기존 단일 제어부를 아래 마크업으로 바꾼다.

```tsx
<div className="mb-4 space-y-2">
  <div className="flex items-center">
    <GardenPageNav />
  </div>
  <div className="flex flex-wrap items-center gap-2">
    <MonthSelector value={yearMonth} onChange={setYearMonth} />
    <SegmentedGroup label="리포트 종류">
      <SegmentedButton active={tab === 'class'} onClick={() => setTab('class')}>
        학급
      </SegmentedButton>
      <SegmentedButton active={tab === 'student'} onClick={() => setTab('student')}>
        개인
      </SegmentedButton>
    </SegmentedGroup>
  </div>
</div>
```

- [ ] **Step 3: 동작과 화면을 확인한다**

로컬 리포트 화면에서 다음을 확인한다.

```text
1. 첫째 줄에는 정원·월별 리포트·설정만 보인다.
2. 둘째 줄에는 월 선택이 왼쪽, 학급·개인이 오른쪽에 보인다.
3. 이전/다음 달과 월 선택 팝오버가 선택 월을 바꾼다.
4. 학급/개인 탭 전환이 각각의 리포트를 표시한다.
```

- [ ] **Step 4: 품질 검증을 실행한다**

Run:

```powershell
npm run build
npm run lint
npm test
```

Expected: 세 명령이 오류 없이 종료되고 전체 테스트가 통과한다.

- [ ] **Step 5: 커밋한다**

```powershell
git add -- src/routes/GrowthGardenReportPage.tsx
git commit -m "fix: 월별 리포트 제어부 순서 조정"
```
