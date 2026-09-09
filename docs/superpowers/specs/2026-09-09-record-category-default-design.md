# 누가기록 카테고리 기본값 설계

## 목표

학생 상세의 누가기록에서 교사가 카테고리 필터를 선택한 뒤 기록 추가를 열면, 새 기록 폼의 카테고리를 선택한 필터로 미리 선택한다.

## 동작

- `RecordTimeline`은 현재 선택된 `RecordCategory | 'all'` 필터를 부모에게 알린다.
- `StudentDetailPage`는 이 필터를 보관하고, 기록 추가용 `RecordForm.initialValues.category`에 전달한다.
- 특정 카테고리가 선택돼 있으면 그 카테고리가 새 기록의 기본값이다.
- `전체`가 선택돼 있으면 기존 기본값인 `생활지도`를 사용한다.
- 기록 수정 폼은 편집 대상 기록의 카테고리를 계속 사용한다.

## 범위 및 검증

- 데이터 모델, Supabase 훅, 저장 API는 변경하지 않는다.
- `RecordTimeline`의 필터 변경 알림과 `StudentDetailPage`의 폼 초기값 전달을 컴포넌트 테스트로 확인한다.
- `npm test`, `npm run lint`, `npm run build`를 실행한다.
