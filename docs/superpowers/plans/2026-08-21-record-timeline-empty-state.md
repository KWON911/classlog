# 학급기록 생활기록 빈 상태 안내 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학급기록의 학생 상세 화면(`/students/:id`)에서 생활기록이 없을 때 "기록이 없습니다."라는 텍스트만 덩그러니 뜨던 것을, 다음에 뭘 해야 하는지 명확히 안내하는 카드형 빈 상태로 바꾼다.

**Architecture:** `RecordTimeline.tsx`의 빈 상태 렌더링 부분만 수정한다. 이 코드베이스의 기존 카드형 빈 상태 관례(`YorokTable.tsx`의 "아직 추가된 컬럼이 없습니다" 블록)를 그대로 재사용하고, 학생에게 기록이 아예 없는 경우와 현재 선택된 카테고리 필터에만 기록이 없는 경우를 구분한 문구를 보여준다. 로직/데이터 흐름 변경 없음 — 순수 렌더링 변경.

**Tech Stack:** React 19 + TypeScript, Tailwind CSS v4 (신규 의존성 없음)

## Global Constraints

- 이 코드베이스의 기존 카드형 빈 상태 관례는 `rounded-[14px] border border-gray-200 bg-white px-6 py-14 text-center` 컨테이너 안에 `text-sm font-medium text-gray-700` 제목 한 줄 + `text-sm text-gray-500` 안내 한 줄 두 단락 — `YorokTable.tsx`의 "아직 추가된 컬럼이 없습니다" 블록과 동일한 값을 그대로 쓴다.
- "생활기록 / 상담" 섹션의 기록 추가 버튼은 `StudentDetailPage.tsx`에서 렌더링되고 라벨은 "기록 추가"다 — 안내 문구에서 이 버튼 이름을 정확히 인용한다.
- `RecordTimeline`은 `records`(전체 목록)와 `filter`(현재 선택된 카테고리, `RecordCategory | 'all'`)를 이미 컴포넌트 내부 상태로 가지고 있다 — 새 prop을 추가하지 않고 기존 값만으로 두 가지 문구를 판단한다.
- 컴포넌트/라우트는 이 프로젝트의 자동화 테스트 대상이 아니다(`npm run build` + `npm run lint` + 수동 스모크로 검증) — 새 테스트 파일을 만들지 않는다.

---

### Task 1: RecordTimeline 빈 상태를 안내형 카드로 교체

**Files:**
- Modify: `src/components/RecordTimeline.tsx:38-82`

**Interfaces:**
- Consumes: 없음 (컴포넌트 내부의 기존 `records`, `filter`, `filtered` 값만 사용)
- Produces: 없음 (외부에서 참조하는 새 함수/타입 없음)

- [ ] **Step 1: 빈 상태 문구를 계산하는 지역 변수 추가**

`src/components/RecordTimeline.tsx`에서 `filtered` 선언 바로 아래(현재 25-28행)에 다음을 추가:

```tsx
  const hasNoRecordsAtAll = records.length === 0
  const emptyTitle = hasNoRecordsAtAll
    ? '아직 등록된 생활기록이 없습니다.'
    : `"${filter}" 카테고리에 해당하는 기록이 없습니다.`
  const emptyHint = hasNoRecordsAtAll
    ? '위의 "기록 추가" 버튼을 눌러 첫 기록을 남겨보세요.'
    : '다른 카테고리를 선택하거나 위의 "기록 추가" 버튼으로 새 기록을 남겨보세요.'
```

(`filter === 'all'`이면서 `records.length === 0`인 경우와 특정 카테고리를 선택했지만 전체 기록 자체가 없는 경우 모두 `hasNoRecordsAtAll` 분기로 처리된다 — `filter`가 `'all'`이면 `filtered`가 곧 `records`이므로 `filtered.length === 0`은 항상 `records.length === 0`과 같고, 카테고리 필터가 걸려 있는데 그 카테고리에만 기록이 없는 경우에만 두 번째 분기가 쓰인다.)

- [ ] **Step 2: 목록/빈 상태 렌더링을 조건 분기로 교체**

현재:

```tsx
      <ul className="flex flex-col gap-3">
        {filtered.map((record) => (
          <li key={record.id} className="rounded-[14px] border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-500">
                {record.record_date} · {record.category}
              </span>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => onEdit(record)}
                  aria-label="기록 수정"
                  title="기록 수정"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setDeleteTarget(record)}
                  aria-label="기록 삭제"
                  title="기록 삭제"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-gray-900">{record.content}</p>
          </li>
        ))}
        {filtered.length === 0 && <p className="text-sm text-gray-500">기록이 없습니다.</p>}
      </ul>
```

다음으로 변경:

```tsx
      {filtered.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {filtered.map((record) => (
            <li key={record.id} className="rounded-[14px] border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-500">
                  {record.record_date} · {record.category}
                </span>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => onEdit(record)}
                    aria-label="기록 수정"
                    title="기록 수정"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(record)}
                    aria-label="기록 삭제"
                    title="기록 삭제"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-gray-900">{record.content}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-[14px] border border-gray-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-medium text-gray-700">{emptyTitle}</p>
          <p className="text-sm text-gray-500">{emptyHint}</p>
        </div>
      )}
```

(기존에는 빈 상태 `<p>`가 `<ul>`의 직계 자식으로 들어가 있어 `<li>`로 감싸이지 않은 채 목록 안에 텍스트가 떠 있는 구조였다 — 이번 변경으로 목록이 비어 있을 때는 `<ul>` 대신 카드형 `<div>`를 렌더링하도록 바로잡는다.)

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 타입 에러 없이 성공

- [ ] **Step 4: 린트 확인**

Run: `npm run lint`
Expected: 통과

- [ ] **Step 5: 자동화 테스트 확인**

Run: `npm test`
Expected: 기존 204개 테스트 전부 통과 (컴포넌트는 자동화 테스트 대상이 아니므로 회귀 확인 목적)

- [ ] **Step 6: 수동 브라우저 확인**

`npm run dev`로 로그인 후 `/students`에서 기록이 하나도 없는 학생을 선택해 `/students/:id`로 이동한 뒤:
- "생활기록 / 상담" 섹션에 "아직 등록된 생활기록이 없습니다." / "위의 \"기록 추가\" 버튼을 눌러 첫 기록을 남겨보세요." 두 줄이 카드 형태(둥근 테두리)로 뜨는지 확인
- "기록 추가" 버튼을 눌러 아무 카테고리로나 기록 하나를 실제로 추가
- 추가한 기록이 뜬 상태에서 방금 추가한 카테고리가 아닌 다른 카테고리 필터(예: "진로")를 선택 → "\"진로\" 카테고리에 해당하는 기록이 없습니다." / "다른 카테고리를 선택하거나 위의 \"기록 추가\" 버튼으로 새 기록을 남겨보세요." 문구가 뜨는지 확인
- "전체" 필터로 되돌리면 방금 추가한 기록이 다시 보이는지 확인
- 방금 추가한 테스트용 기록을 삭제(휴지통 아이콘 → 확인)해 원래 상태로 되돌리기 — 실사용 데이터를 남기지 않는다

- [ ] **Step 7: 커밋**

```bash
git add src/components/RecordTimeline.tsx
git commit -m "fix: guide teachers to add a record when the timeline is empty"
```

## 영향받는 파일

- `src/components/RecordTimeline.tsx` — 빈 상태 렌더링을 카드형 안내 블록으로 교체, 전체-없음/필터-없음 두 가지 문구 분기 추가. 그 외 파일 변경 없음.
