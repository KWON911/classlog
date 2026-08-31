# AGENTS.md

> 이 문서는 기존 `AGENTS.md`와 `CLAUDE.md`의 내용을 Codex 작업 지침으로 통합한 기준 문서다. 둘 사이에 표현 또는 예시가 다르면, 현재 코드·마이그레이션·`docs/superpowers/specs/`에 구현된 실제 구조를 우선한다. `README.md`는 초기 MVP 설명이 남아 있을 수 있으므로 현재 범위의 기준 문서로 사용하지 않는다.

## 앱 전체 구조 및 운영 기준

### 프로젝트 범위

Classlog는 한국어 초등학교 교사용 학급 관리 대시보드다. 공통 사이드바 `AppShell` 아래에 홈(NEIS 시간표·급식·일정), 정보관리(명단 CRUD·CSV·학교/NEIS 설정), 학급기록(학생별 생활·상담 기록), 출결관리, 자리배치, 학급 성장정원이 있다.

- 운영 주소는 `https://classlog-ten.vercel.app`이며 `main` 브랜치 푸시는 Vercel에서 자동 배포된다.
- 중요한 기능 변경 전에는 `docs/superpowers/specs/`와 대응하는 `docs/superpowers/plans/`를 먼저 확인한다. 문서가 없으면 `git log`로 기존 의도를 확인한다.
- 공지, 성적, 다학년 학급 전환, 학생/학부모 전용 화면, 보호자 테이블 정규화는 과거에 보류된 범위일 수 있다. 현재 라우트와 명세를 확인하기 전에는 범위 밖이라고 단정하지 않는다.

### 개발·검증 명령

```bash
npm run dev              # Vite 개발 서버
npm run build            # tsc -b + Vite production build
npm run lint             # oxlint
npm test                 # 전체 Vitest 실행
npm test -- <pattern>    # 대상 테스트만 실행
npm run preview          # production build 미리보기
```

- `test:watch` 스크립트는 없다. 필요하면 `npx vitest`를 직접 사용한다.
- `npm run build`의 `tsc -b`는 `api/`를 검사하지 않는다. `api/neis.ts` 또는 `api/_lib/`를 바꾸면 로컬 build/lint 외에도 Vercel 배포 상태와 로그를 반드시 확인한다.
- 프로젝트 TypeScript 설정은 `strict`가 아니다. 특히 nullability 오류를 컴파일러가 잡는다고 가정하지 말고, 호출 경계와 화면 데이터를 직접 검토한다.

### 환경변수·배포·NEIS

- `.env.example`을 `.env`로 복사해 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 설정한다. `.env`는 커밋하거나 노출하지 않는다.
- `NEIS_API_KEY`는 서버 전용 환경변수이며 절대 `VITE_` 접두사를 붙이지 않는다.
- Vercel에도 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `NEIS_API_KEY`를 별도로 설정해야 한다. 환경변수 변경은 기존 배포에 소급되지 않으므로 새 배포가 필요하다.
- 개발 환경의 NEIS 요청은 `vite.config.ts`의 `neisDevProxy`, 운영은 `api/neis.ts`를 거친다. 공통 허용 목록과 프록시 로직은 `api/_lib/neisProxy.ts`에만 둔다.
- 브라우저는 `src/lib/services/neis-service.ts`를 통해서만 `/api/neis`를 호출한다. 브라우저에서 NEIS 호스트나 API 키를 직접 사용하지 않는다.
- Vercel Node ESM의 `api/neis.ts`는 `neisProxy` 상대 import에 `.js` 확장자가 필요하고, Vite 설정은 `.ts` 확장자가 필요하다. 두 파일의 import 형식을 서로 복사하지 않는다.

### 라우팅·데이터 접근 경계

- `/login`만 공개 라우트다. 나머지는 `<ProtectedRoute>` → `<AppShell>` 아래에 둔다. 페이지마다 `ProtectedRoute`를 다시 감싸 AppShell 또는 인증 상태가 재마운트되는 구조를 만들지 않는다.
- 주요 라우트: `/home`, `/students`, `/students/:id`, `/students/manage`, `/attendance`, `/seating`, `/growth-garden`, `/growth-garden/:studentId`, `/growth-garden/report`, `/growth-garden/settings`.
- `supabaseClient`의 Supabase SDK는 `src/lib/hooks/` 안에서만 직접 import한다. 컴포넌트와 라우트는 훅을 소비할 뿐 직접 쿼리하지 않는다.
- NEIS는 위 규칙의 병렬 예외로, NEIS 훅이 순수 fetch 서비스 `neis-service.ts`를 사용한다.
- `useStudents`의 다건 추가는 배열 `insert` 한 번으로 처리한다. 학생 수만큼 API 요청을 반복하지 않는다.

### 명단·CSV·자리배치

- `/students`는 조회와 생활/상담 기록 중심이고, `/students/manage`는 학생 정보 편집·삭제·CSV·학교 설정 중심이다. 두 UI를 하나의 모드 토글로 합치지 않는다.
- `Student` 필드를 추가하면 `StudentForm`, `StudentDetailModal`, `src/lib/csv.ts`의 고정 12열 포맷을 모두 점검한다.
- CSV 파싱은 의존성 없는 `src/lib/csv.ts`를 유지한다. 주소의 쉼표와 Excel의 CP949/EUC-KR 인코딩, 유효하지 않은 행의 한국어 사유 표시, 미리보기 후 반영 흐름을 보존한다.
- 자리 배치 알고리즘은 순수 모듈 `src/lib/seating.ts`, 저장은 `useSeatingPlans`로 분리한다. JSONB 좌석 데이터의 학생 소속 일관성은 DB RLS가 아니라 앱에서 보장해야 한다.

### Supabase 데이터·RLS

- 기본 테이블은 `students`, `records`, `attendance`, `seating_plans`, `school_settings`이고, 성장정원은 `growth_points`, `growth_settings`, `monthly_awards`, `rewards`를 사용한다.
- 모든 새 Supabase 데이터는 기존 인증·`teacher_id = auth.uid()` 소유권·RLS 패턴을 따른다. `records`, `attendance`, `growth_points`처럼 학생 ID를 참조하는 데이터는 해당 학생의 소유권 검증도 유지한다.
- `school_settings`는 `teacher_id`가 기본키인 교사당 한 행 설정이다.
- 기존 운영 DB에 `supabase/schema.sql`의 초기 생성문을 재실행해 스키마 변경을 해결하려 하지 않는다. 파괴적인 DROP/재생성은 금지하고, 추가 전용·안전한 migration을 작성한다.

### 테스트 작성 기준

- 순수 로직과 훅은 Vitest 테스트를 추가·수정한다. 화면 컴포넌트와 라우트는 기존 관례상 build, lint, 관련 수동 스모크 테스트로 검증한다.
- Supabase 훅 테스트는 `src/test/supabaseMock.ts`의 `createQueryBuilder`를 재사용한다.
- `vi.mock()` 팩토리에서 참조하는 변수는 mock hoisting 규칙에 맞게 `mock` 접두사를 사용한다.
- 정렬을 검증하는 fixture는 정렬 전후 결과가 달라지게 만든다. 이미 정렬된 fixture만으로 정렬 테스트를 통과시키지 않는다.

### 학급 성장정원의 실제 구현 경계

- 성장정원 명단은 별도 학생 테이블이 아니라 공통 `useStudents()`를 사용한다. 점수 기록만 `growth_points`에 별도로 저장한다.
- 데이터 접근은 `growth-garden/services/`의 `GrowthGardenService` 인터페이스를 통한다. `useGrowthGarden`은 Supabase를 직접 호출하지 않는다. 현재 데이터 소스는 `constants.ts`의 `GROWTH_GARDEN_DATA_SOURCE = 'supabase'`이며, mock은 DB 없는 화면 확인용 localStorage 구현이다.
- 성장 포인트는 저장된 별도 누적값이 아니라 `growth.ts`가 기록에서 파생한다. 실제 성장 기록의 타입·필드명은 코드의 `GrowthPointEntry`/`growth_points`를 우선하며, 이 문서의 `BehaviorRecord` 표기는 도메인상 상벌점 기록을 뜻하는 일반 명칭이다.
- 단계·진행도·학생별 요약·학급 환경 계산은 `growth.ts`의 순수 함수와 `useGrowthSettings()`가 제공한 단계표를 사용한다. `constants.ts`의 기본값을 DB에 중복 저장하지 않는다.
- 카드 보기와 정원 보기는 동일한 `visibleStudents`와 `PlantIllustration`을 공유하고, `variant`로 화분/땅 표현만 바꾼다.
- 정원 식물은 기록 모달을 여는 버튼이다. hover/포커스 안내에는 추가 버튼을 넣지 않으며, 상세 링크는 모달 하단에 둔다.
- 정원 레이아웃의 열 수·식물 크기·글자 크기·간격은 `gardenLayout.ts`가 CSS 변수로 계산한다. 일반 보기에는 높이 제약을 강제하지 않고, 전체화면에만 한 화면 내 배치 제약을 적용한다.
- 배경 환경은 검색 결과가 아닌 전체 활성 학급의 1인당 평균 점수로 계산한다. 장식은 학생 식물 뒤에 두고 불투명도를 낮게 유지한다.
- 자연 효과는 `GardenAmbientLayer`의 결정적 인덱스 기반 값과 CSS 애니메이션을 사용한다. SVG `<g>`에 framer-motion의 `originX`/`originY` 변환을 적용하지 않는다.
- 월별 리포트는 같은 성장 기록에서 파생한다. 월 경계는 로컬 시각 기준 `[월초 00:00, 다음 월초 00:00)`이고 문자열 부분 비교를 하지 않는다.
- 일괄 상벌점은 `useStudentSelection` → `useGrowthRecorder` → `useGrowthGarden.addBulkPoints` → 서비스 `addEntries(rows)`의 단일 insert 경로를 사용한다. 일괄 취소는 같은 `batch_id`의 기록만 `deleteBatch`로 지우며 점수는 남은 기록에서 재계산한다.
- `BULK_PULSE_LIMIT`를 넘는 일괄 저장에는 학생별 식물 펄스를 재생하지 않는다.


## 프로젝트 개요

이 저장소는 초등학교 교사용 웹앱 프로젝트이며, 주요 기능 중 하나로 **학급 성장정원**을 포함한다.

학급 성장정원은 학생별 상점/벌점 기록을 성장 포인트로 환산하고, 학생의 식물과 학급 전체 정원이 점진적으로 성장하는 방식의 웹앱이다.

기존 기능을 유지하면서 새 기능을 점진적으로 확장하는 것을 최우선으로 한다.

---

## 기본 기술 스택

- React
- Vite
- TypeScript
- Supabase
- 반응형 웹
- 기존 프로젝트의 routing / component / service / repository 구조를 우선 사용

새 라이브러리는 정말 필요한 경우에만 추가한다.

이미 설치된 라이브러리나 기존 공통 컴포넌트가 있다면 우선 재사용한다.

---

## 작업 시작 규칙

새 작업을 시작하기 전에 반드시 현재 저장소를 먼저 확인한다.

특히 다음을 먼저 파악한다.

- 현재 폴더 구조
- routing 방식
- Student / BehaviorRecord 타입
- class / roster 구조
- Supabase 연결 구조
- Auth 및 RLS 구조
- service / repository 구조
- 기존 modal / sheet / toast
- 기존 Plant SVG
- 성장 단계 계산 로직
- 사용자 GrowthSettings
- 학급 정원 단계 계산 로직
- 월별 리포트
- 전체화면 / 자연 애니메이션 관련 코드

이미 존재하는 기능을 새로 중복 구현하지 않는다.

---

## 코드 수정 원칙

- 기존 구조를 최대한 유지한다.
- 이번 작업과 관계없는 코드는 임의로 리팩터링하지 않는다.
- unrelated 파일을 대규모로 수정하지 않는다.
- 기존 기능이 정상 작동하는 상태를 보존한다.
- 같은 비즈니스 로직을 여러 곳에 복제하지 않는다.
- 공통 로직은 service / repository / utility / hook 등 기존 프로젝트 방식에 맞춰 재사용한다.
- UI 컴포넌트에서 Supabase SDK를 직접 호출하지 않는다.
- 환경변수와 API Key를 코드에 하드코딩하지 않는다.
- 기존 데이터를 삭제하거나 DROP TABLE 하는 파괴적 migration을 만들지 않는다.

---

# 학급 성장정원 핵심 도메인 규칙

## 학생 성장 포인트

학생은 `growthPoint`를 가진다.

- 상점: growthPoint 증가
- 벌점: growthPoint 감소
- growthPoint는 기본적으로 0 미만으로 내려가지 않는다.

상벌점 기록은 반드시 BehaviorRecord로 남긴다.

growthPoint와 BehaviorRecord가 서로 불일치하지 않도록 한다.

---

## BehaviorRecord

기존 데이터 모델을 우선 사용한다.

필요한 경우 다음 개념을 유지한다.

- studentId
- type: merit | demerit
- score
- reason
- createdAt
- source
- batchId

개별 상벌점과 일괄 상벌점 모두 기존 리포트와 통계에 동일하게 반영되어야 한다.

---

# 개인 식물 성장

## 성장 단계

현재 프로젝트에 정의된 성장 단계를 그대로 사용한다.

예시 구조:

1. 씨앗
2. 새싹
3. 작은 잎
4. 줄기 성장
5. 풍성한 잎
6. 꽃봉오리
7. 꽃 피움

실제 단계명과 단계 수가 코드에 이미 존재하면 기존 값을 우선한다.

---

## 성장 기준

성장 단계의 점수 기준은 하드코딩하지 않는다.

사용자가 설정한 `GrowthSettings`를 사용한다.

사용자 설정이 없으면 현재 프로젝트의 기본값을 사용한다.

설정 변경 시:

- BehaviorRecord는 변경하지 않는다.
- growthPoint는 변경하지 않는다.
- 현재 점수에서 어떤 성장 단계로 보이는지만 다시 계산한다.

모든 화면은 동일한 중앙 계산 로직을 사용한다.

예:

- 학생 카드
- 학생 상세
- 정원 보기
- 전체화면
- 월별 리포트
- 특별 축하 화면
- progress bar

---

# 학급 전체 정원

학급 전체 정원 단계는 **현재 활성 학급 학생들의 평균 growthPoint**를 기준으로 계산한다.

정원 단계 기준 역시 사용자의 설정값을 사용한다.

현재 학급 학생만 평균 계산에 포함한다.

다른 학급 학생, 삭제된 학생, 비활성 학생은 포함하지 않는다.

학생이 0명일 때 division by zero가 발생하지 않도록 처리한다.

---

# 정원 보기

정원 보기는 단순 카드 목록이 아니라 하나의 큰 정원처럼 보여야 한다.

학생 한 명당 식물 하나가 배치된다.

우선순위:

1. 학생 이름 식별
2. 학생 식물 식별
3. 성장 단계 식별
4. 정원 배경
5. 자연 애니메이션

장식 때문에 학생 정보가 묻히면 안 된다.

---

# 전체화면 정원 보기

브라우저 Fullscreen API를 사용한다.

전체화면에서는 단순히 컨테이너만 커지면 안 된다.

화면 크기와 학생 수에 따라 다음을 자동 조정한다.

- 식물 크기
- 학생 이름 크기
- 식물 간 간격
- row / column 수
- 정원 영역 크기

전체화면에서 식물이 작게 보이거나 주변 여백이 과도하게 남으면 안 된다.

교실 프로젝터나 대형 화면에서도 학생들이 자기 식물을 한눈에 찾을 수 있어야 한다.

---

# 자연 애니메이션

정원에는 자연스럽고 은은한 환경 애니메이션을 사용할 수 있다.

예:

- 나비
- 약한 식물 흔들림
- 소량의 꽃잎
- 높은 정원 단계에서 작은 벌
- 은은한 빛 효과

규칙:

- 나비는 기본적으로 2~4마리 정도로 제한
- 너무 빠른 움직임 금지
- 화면 전체에 과도한 꽃잎 효과 금지
- 학생 이름과 식물을 지속적으로 가리지 않게 처리
- `pointer-events: none`
- transform / opacity 중심 애니메이션
- `prefers-reduced-motion` 지원
- 성능을 해칠 정도로 DOM 요소를 늘리지 않는다.

---

# 다양한 꽃 시스템

최종 꽃은 한 종류로 고정하지 않는다.

학생마다 서로 다른 꽃이 랜덤으로 배정된다.

예시 꽃:

- 튤립
- 해바라기
- 데이지
- 코스모스
- 장미
- 백합
- 기타 기존 디자인과 어울리는 꽃

규칙:

- 학생이나 교사가 꽃을 직접 선택하지 않는다.
- 꽃은 자동 랜덤 배정한다.
- 한 학생에게 배정된 꽃은 계속 동일하게 유지한다.
- 렌더링 때마다 `Math.random()`으로 꽃을 다시 정하지 않는다.
- studentId 기반 deterministic assignment 또는 영구 저장 방식을 사용한다.
- 꽃봉오리 단계에서는 꽃 종류가 완전히 드러나지 않는 연출을 우선한다.
- 최종 꽃 단계에서 학생만의 꽃이 공개되는 느낌을 준다.
- 카드 보기, 정원 보기, 전체화면, 개인 리포트, 특별 축하 화면에서 동일한 꽃을 사용한다.

기존 Plant SVG 스타일과 통일한다.

---

# 선택 학생 일괄 상벌점

별도의 “전체학생 전용 상벌점 시스템”을 만들지 않는다.

다음 하나의 구조로 처리한다.

- 학생 1명 선택
- 여러 명 선택
- 전체 선택

핵심 상태는 가능하면 `selectedStudentIds` 중심으로 관리한다.

예:

`Set<string>`

---

## 선택 모드

평소에는 기존 학생 카드 UI를 유지한다.

교사가 `학생 선택`을 눌렀을 때만 선택 모드가 활성화된다.

선택 모드에서:

- 카드 클릭 → 학생 선택/해제
- 전체 선택
- 전체 해제
- 선택 인원 표시
- 선택 학생 일괄 상점
- 선택 학생 일괄 벌점

일반 모드에서는 기존 학생 상세 클릭 기능을 유지한다.

---

## 전체 선택

전체 선택은 현재 활성 학급의 모든 학생 ID를 `selectedStudentIds`에 넣는 동작이다.

별도의 전체학생 처리 로직을 만들지 않는다.

---

## 일괄 저장

여러 학생에게 지급해도 학생마다 독립적인 BehaviorRecord를 생성한다.

BehaviorRecord 하나에 studentIds 배열만 넣는 구조로 끝내면 안 된다.

같은 일괄 작업은 동일한 `batchId`를 사용한다.

가능하면:

- source: individual | bulk
- batchId

구조를 사용한다.

---

## 데이터 원자성

가능하면 Supabase RPC 또는 Postgres transaction을 사용한다.

하나의 일괄 작업에서:

1. 대상 학생 검증
2. BehaviorRecord 생성
3. growthPoint 업데이트

가 모두 성공하거나 모두 실패하도록 한다.

부분 성공 상태를 피한다.

UI에서 학생별 순차 insert 요청을 반복하지 않는다.

---

## 일괄 지급 취소

batchId를 이용해 해당 일괄 지급 전체를 취소할 수 있는 구조를 유지한다.

취소 시:

- 해당 batchId 기록만 취소
- 다른 BehaviorRecord는 건드리지 않음
- growthPoint 재계산
- 개인 Plant stage 재계산
- 학급 평균 재계산
- Garden Stage 재계산
- 월별 리포트 재계산

가능하면 BehaviorRecord를 source of truth로 활용하는 안전한 재계산 방식을 우선한다.

---

# 월별 리포트

월별 리포트는 다음 두 영역을 제공한다.

- 학급 리포트
- 개인 리포트

월 선택 기능을 제공한다.

기록 범위는 문자열 substring 비교가 아니라 정확한 날짜 범위를 사용한다.

예:

해당 월 첫날 00:00 이상
다음 달 첫날 미만

한국 시간대 및 현재 프로젝트 날짜 처리 방식을 확인한다.

---

## 월간 개인 성장값

월간 성장값은 누적 growthPoint와 별개다.

계산식:

`monthlyGrowth = 해당 월 상점 점수 합계 - 해당 월 벌점 점수 합계`

사용자가 개인 식물 성장 기준을 바꿔도 이 계산식은 변경하지 않는다.

---

## 월간 성장순

교사용 화면에서는 학생들을 monthlyGrowth 기준으로 정렬할 수 있다.

예:

- 번호순
- 이름순
- 이번 달 성장순

학생들에게 전체 순위표를 공개하는 화면은 만들지 않는다.

---

# 월간 수상자

월간 성장순 결과를 바탕으로 교사가 수상자를 직접 선정한다.

1위라고 자동 수상시키지 않는다.

여러 명을 수상자로 선정할 수 있다.

동점자는 공동 수상 가능하다.

기본 수상명 예:

`○월 성장의 꽃`

보상을 지급해도 growthPoint는 차감하지 않는다.

상벌점 기록과 보상 기록은 분리한다.

---

# 학생 특별 축하 화면

수상 학생에게는 전체화면 특별 축하 화면을 보여줄 수 있다.

학생용 특별 화면에서는 다음을 강조한다.

1. 학생 이름
2. 학생 고유의 꽃
3. 수상명
4. 이번 달 성장값
5. 대표 긍정 행동
6. 특별 보상

학생용 화면에는 다음을 표시하지 않는다.

- 전체 순위
- 1위 / 1등 / TOP 1 표현
- 벌점 상세
- 교사용 관리 버튼

기존 GardenBackground, Plant, Butterfly, FallingPetal, Fullscreen 기능을 최대한 재사용한다.

---

# 보상 데이터

보상은 상벌점과 독립적인 데이터다.

보상 지급 시 growthPoint를 자동 차감하지 않는다.

가능하면 다음 개념을 유지한다.

- class reward
- student reward
- MonthlyAward
- year
- month
- studentId
- title
- rewardTitle
- rewardDescription
- awardedAt

학생 이름은 중복 저장하지 않고 studentId로 연결한다.

---

# GrowthSettings

개인 식물 성장 기준과 학급 정원 성장 기준을 사용자가 직접 수정할 수 있다.

기본값은 현재 프로젝트에 이미 존재하는 값을 그대로 사용한다.

새 기본값을 임의로 만들지 않는다.

---

## 개인 성장 기준

각 단계의 점수는 반드시 오름차순이어야 한다.

예:

3 < 6 < 10 < 15 < 20 < 25

잘못된 설정은 저장하지 않는다.

---

## 학급 정원 성장 기준

학급 정원 기준은 학생들의 평균 growthPoint 기준이다.

사용자가 평균 점수 threshold를 수정할 수 있다.

설정 변경 시 기존 학생 점수나 기록은 수정하지 않는다.

---

# Supabase

Supabase를 사용하는 모든 새 기능은 기존 인증, ownership, RLS 구조를 따라야 한다.

다른 사용자의 학생 데이터에 접근하거나 수정할 수 없어야 한다.

UI 컴포넌트에서 직접 Supabase SDK를 호출하지 않는다.

가능하면 service / repository / RPC를 사용한다.

migration은 안전하게 작성한다.

금지:

- DROP TABLE
- 기존 데이터 삭제
- API Key 하드코딩
- service role key 노출

---

# UI/UX 원칙

초등학교 교사가 수업 중 빠르게 사용할 수 있는 것이 우선이다.

- 조작 횟수 최소화
- 버튼과 학생 이름은 충분히 크게
- iPad 터치 영역 고려
- 색상만으로 상태 표현하지 않기
- 화면을 지나치게 관리자 대시보드처럼 만들지 않기
- 밝고 따뜻한 성장정원 디자인 유지
- 귀엽지만 지나치게 유아적이지 않게

---

# 반응형 우선순위

1. 교실 PC
2. iPad
3. 노트북
4. 모바일

---

# 접근성

다음을 기본적으로 고려한다.

- keyboard navigation
- focus state
- dialog focus management
- 충분한 버튼 크기
- 충분한 텍스트 대비
- `prefers-reduced-motion`

---

# 금지 사항

다음은 하지 않는다.

- 학생 전체 순위 공개
- 벌점 중심의 부정적 연출
- 식물이 죽거나 시드는 벌점 연출
- 학생별 꽃 수동 선택
- 렌더링마다 꽃 종류 변경
- 기존 성장 기준 하드코딩
- 전체학생 전용 별도 일괄 시스템
- 학생별 반복 API 호출 남발
- 기존 프로젝트 전체 구조 재작성
- unrelated 리팩터링
- 기존 데이터 삭제

---

# 작업 완료 전 검증

변경 후 가능한 범위에서 반드시 다음을 실행한다.

1. TypeScript 검사
2. lint
3. production build

오류가 있으면 직접 수정한다.

새 기능뿐 아니라 기존 기능도 회귀 테스트한다.

특히 확인:

- 개별 상점
- 개별 벌점
- 학생 상세
- Plant 성장
- 카드 보기
- 정원 보기
- 전체화면
- 자연 애니메이션
- 사용자 성장 기준
- 학급 정원 평균
- 월별 리포트
- 월간 성장순
- 수상자 선정
- 특별 축하 화면

---

# 작업 완료 보고 형식

작업 후 장황한 설명 대신 다음을 간단히 보고한다.

## 구현 완료

- 구현한 기능
- 새로 만든 파일
- 수정한 파일
- DB / migration / RPC 변경
- 재사용한 기존 로직
- TypeScript 결과
- lint 결과
- production build 결과
- 사용자가 직접 확인해야 할 부분

---

# Codex 작업 원칙

설계 설명만 하고 끝내지 않는다.

현재 저장소를 먼저 확인한 뒤 실제 파일을 수정한다.

기존 구조를 존중한다.

기존 기능을 최대한 재사용한다.

이번 작업과 관계없는 코드는 건드리지 않는다.

완료 후 build 검증까지 진행한다.
