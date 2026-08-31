# 학생별 꽃 피움 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학생 ID에 고정적으로 배정된 꽃을 최종 성장 단계에서만 공통 식물 SVG에 표시한다.

**Architecture:** `src/lib/growth-garden/flowers.ts`는 외부 상태 없이 `studentId`에서 꽃 종류를 결정하는 순수 유틸리티를 제공한다. `PlantIllustration`은 선택적 `studentId`를 받아 stage 6에서만 해당 꽃 SVG를 그리고, 학생 문맥을 가진 기존 화면은 동일한 ID를 전달한다.

**Tech Stack:** React 19, TypeScript, Framer Motion, inline SVG, Vitest, Vite

## Global Constraints

- stage 0~4의 씨앗·줄기·잎 SVG 및 stage 5의 중립 꽃봉오리는 변경하지 않는다.
- stage 6에서만 튤립·해바라기·데이지·코스모스·장미·백합을 그림으로 공개하고 꽃 이름 텍스트는 표시하지 않는다.
- 렌더링 중 `Math.random()`을 호출하지 않는다.
- `BehaviorRecord`, `GrowthPointEntry`, 성장 점수 계산, 기준 설정, 기존 서비스 계약을 변경하지 않는다.
- 학생 문맥이 없는 단계 안내 UI는 기존 기본 꽃 렌더링을 유지한다.

---

### Task 1: 결정적 꽃 배정 유틸리티

**Files:**
- Create: `src/lib/growth-garden/flowers.ts`
- Create: `src/lib/growth-garden/flowers.test.ts`

**Interfaces:**
- Produces: `FlowerType`, `FLOWER_TYPES`, `flowerForStudent(studentId: string): FlowerType`
- Consumes: 없음

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { describe, expect, it } from 'vitest'
import { FLOWER_TYPES, flowerForStudent } from './flowers'

describe('flowerForStudent', () => {
  it('returns the same flower for the same student ID', () => {
    expect(flowerForStudent('student-17')).toBe(flowerForStudent('student-17'))
  })

  it('returns one of the supported flower types', () => {
    expect(FLOWER_TYPES).toHaveLength(6)
    expect(FLOWER_TYPES).toContain(flowerForStudent('student-42'))
  })
})
```

이 테스트는 배정 함수가 없으므로 모듈을 찾지 못해 실패해야 한다. 이 테스트가 잡을 오류는 같은 학생 ID에 렌더마다 다른 꽃을 반환하거나, 지원하지 않는 꽃 종류를 반환하는 변경이다.

- [ ] **Step 2: 테스트가 예상대로 실패하는지 확인**

Run: `npm test -- src/lib/growth-garden/flowers.test.ts`

Expected: `Failed to resolve import "./flowers"`.

- [ ] **Step 3: 최소 유틸리티 구현**

```ts
export const FLOWER_TYPES = ['tulip', 'sunflower', 'daisy', 'cosmos', 'rose', 'lily'] as const
export type FlowerType = (typeof FLOWER_TYPES)[number]

export function flowerForStudent(studentId: string): FlowerType {
  let hash = 0
  for (let index = 0; index < studentId.length; index += 1) {
    hash = (hash * 31 + studentId.charCodeAt(index)) | 0
  }
  return FLOWER_TYPES[Math.abs(hash) % FLOWER_TYPES.length]
}
```

`Math.abs(-2147483648)`가 음수로 남는 JavaScript 경계값을 피하도록 구현 시 `hash >>> 0`를 사용하거나, 안전한 양수 나머지 연산을 적용한다. 빈 ID도 배열의 첫 항목으로 안정적으로 귀결되어야 한다.

- [ ] **Step 4: 유틸리티 테스트 통과 확인**

Run: `npm test -- src/lib/growth-garden/flowers.test.ts`

Expected: 2 tests passed.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/growth-garden/flowers.ts src/lib/growth-garden/flowers.test.ts
git commit -m "feat: 학생별 꽃 배정 추가"
```

### Task 2: 공통 식물 SVG에 꽃 6종 렌더링

**Files:**
- Modify: `src/components/growth-garden/PlantIllustration.tsx:32-36, 91-93, 232-255`
- Test: `src/lib/growth-garden/flowers.test.ts`

**Interfaces:**
- Consumes: `FlowerType`, `flowerForStudent(studentId)` from `src/lib/growth-garden/flowers.ts`
- Produces: `PlantIllustration` optional prop `studentId?: string`

- [ ] **Step 1: stage 6 분기 테스트 보강**

`flowers.test.ts`에 서로 다른 고정 ID 목록을 넣어 배정 결과가 모두 유효한지 확인한다. 이 테스트가 잡을 오류는 새 꽃 종류를 추가했는데 배정 목록에서 누락하거나, 해시 결과가 배열 범위를 벗어나는 변경이다.

```ts
it('keeps every supplied student assignment within the flower catalog', () => {
  for (const studentId of ['1', '2', 'gu-tae-ri', 'kim-go-eun', 'student-999']) {
    expect(FLOWER_TYPES).toContain(flowerForStudent(studentId))
  }
})
```

- [ ] **Step 2: 보강 테스트가 현재 구현에서 통과하는지 확인**

Run: `npm test -- src/lib/growth-garden/flowers.test.ts`

Expected: 3 tests passed. 이 단계는 기존 유틸리티 계약을 유지한 채 SVG 표현을 추가하는 기준선이다.

- [ ] **Step 3: `PlantIllustration`에 선택적 학생 ID와 꽃 파트 추가**

`PlantIllustrationProps`에 `studentId?: string`을 추가하고, 컴포넌트 초반에 `const flower = studentId ? flowerForStudent(studentId) : 'daisy'`를 계산한다. stage 5의 기존 봉오리 코드는 수정하지 않는다. stage 6의 고정 6잎 꽃 코드를 `FlowerBloom` 컴포넌트로 바꾸고 `flower`에 따라 다음을 inline SVG로 렌더링한다.

- tulip: 컵 형태의 세 갈래 꽃잎과 짧은 중앙선
- sunflower: 작은 노란 꽃잎 다수와 갈색 중심 원
- daisy: 흰 꽃잎 여덟 장과 노란 중심 원
- cosmos: 넓은 분홍 꽃잎 여덟 장과 노란 중심 원
- rose: 겹친 곡선 꽃잎과 어두운 중심
- lily: 길게 벌어진 여섯 꽃잎, 중앙 수술과 꽃밥

모든 꽃은 `stemTop - 8` 부근을 중심으로 하여 기존 줄기 높이·화분/땅 바닥·등장 애니메이션을 재사용한다. 꽃 종류별로 `key={flower}`를 사용해 stage 6 진입 때 동일한 프레이머 모션으로 나타나게 한다.

- [ ] **Step 4: 유틸리티 회귀 테스트 통과 확인**

Run: `npm test -- src/lib/growth-garden/flowers.test.ts`

Expected: 3 tests passed.

- [ ] **Step 5: 커밋**

```bash
git add src/components/growth-garden/PlantIllustration.tsx src/lib/growth-garden/flowers.test.ts
git commit -m "feat: 성장정원 꽃 SVG 추가"
```

### Task 3: 학생 문맥이 있는 모든 식물 화면에 ID 전달

**Files:**
- Modify: `src/components/growth-garden/GardenStudentCard.tsx:76`
- Modify: `src/components/growth-garden/GardenPlot.tsx:72-77`
- Modify: `src/routes/GrowthGardenStudentPage.tsx:102-106`
- Modify: `src/components/growth-garden/report/StudentMonthlyReportView.tsx:174-176, 281-299`
- Modify: `src/components/growth-garden/awards/MonthlyAwardCelebration.tsx:118`

**Interfaces:**
- Consumes: `PlantIllustration` prop `studentId?: string`
- Produces: 카드, 정원, 전체화면 정원, 학생 상세, 개인 월별 리포트, 축하 화면의 동일 학생 꽃

- [ ] **Step 1: 개인 리포트의 `PlantStep` 입력 확장**

`PlantStep` props에 `studentId: string`을 추가하고, 월초·월말 호출 모두 선택된 `student.id`를 전달한다. 내부 `PlantIllustration`에는 `studentId={studentId}`를 넘긴다. 월초가 stage 6이면 같은 꽃을 이미 보여 주며, 월말도 같은 학생 ID이므로 동일한 꽃을 유지한다.

- [ ] **Step 2: 카드·정원 플롯·학생 상세·축하 화면에 ID 전달**

각 기존 `PlantIllustration` 호출에 이미 스코프에 있는 `student.id` 또는 URL에서 읽은 `studentId`를 추가한다. 정원 전체화면은 `GardenView`가 같은 `GardenPlot`을 렌더링하므로 별도 꽃 상태나 새 prop을 만들지 않는다. 축하 화면은 이미 `student` prop을 받으므로 `student.id`를 전달한다.

- [ ] **Step 3: TypeScript 검사와 화면 수동 확인**

Run: `npm run build`

Expected: TypeScript 및 production build success.

로컬 `/growth-garden`에서 card와 garden을 전환하고, stage 6 학생의 꽃이 두 보기에서 같은지 확인한다. 정원 보기에서 전체화면을 켜 꽃 실루엣·색이 여러 학생 사이에서 구별되는지 확인한다. `/growth-garden/:studentId`, `/growth-garden/report`의 개인 리포트, 월별 수상 축하 화면에서도 같은 학생의 꽃이 동일한지 확인한다. stage 5는 공통 봉오리여야 한다.

- [ ] **Step 4: lint와 전체 테스트 실행**

Run: `npm run lint && npm test`

Expected: lint errors 0, all tests passed.

- [ ] **Step 5: 커밋**

```bash
git add src/components/growth-garden/GardenStudentCard.tsx src/components/growth-garden/GardenPlot.tsx src/routes/GrowthGardenStudentPage.tsx src/components/growth-garden/report/StudentMonthlyReportView.tsx src/components/growth-garden/awards/MonthlyAwardCelebration.tsx
git commit -m "feat: 성장정원 화면에 학생별 꽃 적용"
```
