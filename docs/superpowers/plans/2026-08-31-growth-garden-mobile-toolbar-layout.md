# 성장정원 모바일 툴바 정렬 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일 성장정원에서 `학생 선택`은 첫째 줄로 올리고, 정렬·보기 토글은 둘째 줄 한 줄에 표시한다.

**Architecture:** `GrowthGardenBoard`의 제어 영역을 페이지 이동/선택 행과 표시 옵션 행으로 나눈다. Tailwind 반응형 클래스만 조정해 상태 전환 로직과 컴포넌트 인터페이스는 바꾸지 않는다.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Vite, Vitest, oxlint

## Global Constraints

- 모바일에서 `학생 선택`은 `GardenPageNav`와 같은 첫째 줄 오른쪽에 둔다.
- 정렬과 보기 모드는 모바일에서 한 줄로 유지하며 가로 스크롤·줄바꿈을 만들지 않는다.
- `sm` 이상에서는 기존 여백과 툴바 흐름을 유지한다.
- 선택 모드 진입/종료, 정렬, 보기 전환, 접근성 라벨은 바꾸지 않는다.
- 이 프로젝트는 UI 컴포넌트 테스트 대신 프로덕션 빌드·린트·브라우저 수동 검증을 사용한다.

---

### Task 1: 모바일 툴바 행 구조 및 버튼 밀도 조정

**Files:**
- Modify: `src/components/growth-garden/GrowthGardenBoard.tsx:113-151`
- Modify: `src/components/growth-garden/Segmented.tsx:9-42`

**Interfaces:**
- Consumes: `GardenPageNav`, `SelectionToolbar`, `SegmentedGroup`, `SegmentedButton`의 현재 props
- Produces: 동일한 상태·이벤트 인터페이스를 유지한 반응형 툴바 마크업

- [ ] **Step 1: 수정 전 모바일 화면 확인**

로컬 서버에서 `/growth-garden`을 390px 폭으로 열고 다음 현재 상태를 확인한다.

```text
[정원 | 월별 리포트 | 설정]
[학생 선택] [번호순 | 점수순]
[카드 보기 | 정원 보기]
```

- [ ] **Step 2: 툴바 행을 분리한다**

`GrowthGardenBoard`의 툴바를 다음 순서로 배치한다.

```tsx
<div className="mb-4 flex flex-wrap items-center gap-2">
  <GardenPageNav />
  {viewMode === 'card' && !selection.active && (
    <div className="ml-auto">
      <SelectionToolbar classSize={students.length} onEnter={selection.enter} />
    </div>
  )}
  {!selection.active && (
    <div className="flex w-full flex-nowrap items-center gap-2 sm:w-auto">
      <SegmentedGroup label="정렬 기준">
        <SegmentedButton active={sortMode === 'number'} onClick={() => setSortMode('number')}>
          번호순
        </SegmentedButton>
        <SegmentedButton active={sortMode === 'score'} onClick={() => setSortMode('score')}>
          점수순
        </SegmentedButton>
      </SegmentedGroup>
      <SegmentedGroup label="보기 모드">
        <SegmentedButton active={viewMode === 'card'} onClick={() => setViewMode('card')}>
          <LayoutGrid size={14} aria-hidden="true" />
          카드 보기
        </SegmentedButton>
        <SegmentedButton active={viewMode === 'garden'} onClick={() => setViewMode('garden')}>
          <Sprout size={14} aria-hidden="true" />
          정원 보기
        </SegmentedButton>
      </SegmentedGroup>
    </div>
  )}
</div>
```

`GardenPageNav`와 `학생 선택`은 모바일 첫째 줄을 함께 사용한다. `GardenPageNav`의 버튼 좌우 여백을 모바일에서만 줄여 375px 폭에서도 두 컨트롤이 같은 줄에 들어오게 한다. 표시 옵션 행은 `overflow-hidden` 없이 폭 안에 들어오게 한다.

- [ ] **Step 3: 모바일에서 분절 버튼의 가로 여백을 줄인다**

`SegmentedButton`의 패딩을 모바일 `px-2`, `sm` 이상 `sm:px-3`으로 바꾼다. 버튼 높이(`h-9`), 문구, 아이콘, 활성 상태 스타일은 그대로 둔다.

```tsx
className={`inline-flex items-center gap-1 px-2 sm:px-3 font-medium transition-colors ${...}`}
```

- [ ] **Step 4: 상태 전환을 수동 확인한다**

390px 폭에서 다음을 확인한다.

```text
1. 첫째 줄: GardenPageNav와 학생 선택이 함께 표시된다.
2. 둘째 줄: 번호순·점수순·카드 보기·정원 보기가 한 줄에 표시된다.
3. 학생 선택을 누르면 SelectionActionBar가 카드 격자 위에 나타난다.
4. 정원 보기에서는 학생 선택이 사라지고 표시 옵션 행은 유지된다.
```

- [ ] **Step 5: 품질 검증을 실행한다**

Run:

```powershell
npm run build
npm run lint
npm test
```

Expected: 세 명령이 오류 없이 끝나며 전체 테스트가 통과한다.

- [ ] **Step 6: 커밋한다**

```powershell
git add -- src/components/growth-garden/GrowthGardenBoard.tsx src/components/growth-garden/Segmented.tsx
git commit -m "fix: 모바일 성장정원 툴바 정렬"
```
