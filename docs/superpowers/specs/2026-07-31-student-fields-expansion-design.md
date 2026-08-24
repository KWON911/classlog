---
render_with_liquid: false
---

# 학생 명부 필드 확장 (학교 공식 양식 대응) 설계

## 배경

학생 명부의 필드가 학교에서 실제로 쓰는 공식 양식(인천예송초 2026 학생명부)과 달라서, 그 양식의 정보를 그대로 담을 수 있도록 확장한다. 공식 양식은 번호·성명·성별·생년월일·학생 전번·주소·부성명·부 전번·모성명·모 전번·비상연락처·비고, 총 12개 열로 구성되어 있다.

## 범위

**포함**
- `students` 테이블 필드를 위 12개 열에 맞게 재정의 (기존 `parent_phone` 제거, 8개 필드 신규 추가)
- 학생 추가/수정 폼, 명부 목록, 학생 상세 화면에서 확장된 필드 반영
- CSV 가져오기의 열 구성을 5열에서 12열로 확장 (열 순서는 공식 양식과 동일)
- 샘플 CSV 파일(루트, `public/`) 갱신

**제외**
- 부/모 정보를 별도 테이블로 정규화 (템플릿이 항상 "부 1명 + 모 1명" 고정 구조라 불필요, `students` 테이블에 컬럼으로 추가하는 것으로 충분)
- 생년월일의 날짜 타입 변환 및 이를 이용한 나이 계산 등 파생 기능
- 기존 데이터 마이그레이션 스크립트 (현재 Supabase에 있는 데이터는 테스트용이라 스키마 재생성으로 처리)

## 데이터 모델

`supabase/schema.sql`의 `students` 테이블을 아래와 같이 재정의한다. 기존 `parent_phone` 컬럼은 제거하고, 8개 컬럼을 추가한다. `records` 테이블과 RLS 정책은 변경하지 않는다.

| 필드(한글) | 컬럼명 | 타입 | 필수 |
|---|---|---|---|
| 번호 | `number` | integer | 필수 |
| 성명 | `name` | text | 필수 |
| 성별 | `gender` | text \| null | 선택 |
| 생년월일 | `birthdate` | text \| null | 선택 (원본 표기 그대로 저장, 예: `240304`) |
| 학생 전번 | `student_phone` | text \| null | 선택 |
| 주소 | `address` | text \| null | 선택 |
| 부성명 | `father_name` | text \| null | 선택 |
| 부 전번 | `father_phone` | text \| null | 선택 |
| 모성명 | `mother_name` | text \| null | 선택 |
| 모 전번 | `mother_phone` | text \| null | 선택 |
| 비상연락처 | `emergency_contact` | text \| null | 선택 |
| 비고 | `note` | text \| null | 선택 |

`teacher_id`, `id`, `created_at`은 변경하지 않는다. RLS 정책(`teacher_id = auth.uid()`)도 변경하지 않는다.

현재 Supabase의 `students`/`records` 데이터는 테스트용이므로, 새 스키마 적용은 기존 테이블을 `drop`하고 다시 `create`하는 방식으로 진행한다(마이그레이션 스크립트 불필요).

## 영향받는 코드

- `src/lib/types.ts`: `Student` 타입을 위 12개 필드로 재정의
- `src/lib/hooks/useStudents.ts`: `Student` 타입 변경에 따라 `NewStudent`/`StudentUpdate`(둘 다 `Student`에서 파생)도 자동으로 넓어짐. 로직 변경 없음
- `src/components/StudentForm.tsx`: 입력 필드를 12개로 확장 (열 순서와 동일한 순서로 배치)
- `src/components/StudentListItem.tsx`: 명부 목록의 요약 정보 갱신 (현재 "학부모 연락처" 한 줄 → 부/모 연락처를 각각 표시)
- `src/routes/StudentDetailPage.tsx`: 상세 화면 헤더의 학생 정보 표시 갱신, `StudentForm`에 넘기는 `initialValues` 매핑 갱신
- `src/routes/StudentListPage.tsx`: `handleAdd`가 폼 값을 `addStudent`에 넘기는 매핑을 12개 필드로 확장
- `src/lib/csv.ts`: `ParsedStudentRow` 타입과 `parseStudentsCsv`의 열 파싱·검증 로직을 12열 기준으로 재작성. 검증 규칙(이름·출석번호 필수, 중복 판정, 헤더 감지)은 동일하게 유지하고 열 위치만 확장
- `src/components/ImportStudentsPanel.tsx`: 미리보기 목록에 확장된 필드 표시
- `sample-students.csv`(루트), `public/sample-students.csv`: 12열 형식으로 재생성 (UTF-8 BOM 유지)

## 에러 처리 / 테스트

- 유효성 검증 규칙은 기존과 동일: 이름·출석번호만 필수, 나머지 10개 필드는 모두 선택
- `src/lib/csv.test.ts`는 열 개수 변경에 맞춰 전면 재작성한다. 테스트 항목 자체(유효 행 파싱, 헤더 감지, 이름/번호 누락, 번호가 숫자가 아닌 경우, 기존 명부와의 중복, 파일 내 중복, 헤더 행이 skipped에 기록되는지)는 기존과 동일하게 유지하고 픽스처 데이터만 12열로 확장
- `src/lib/hooks/useStudents.test.ts`의 픽스처(가짜 학생 객체)도 확장된 `Student` 타입에 맞게 갱신. 훅 자체의 로직(정렬, 에러 처리, 벌크 삽입)은 변경하지 않으므로 테스트 케이스 구성은 그대로 유지
- `StudentForm`/`StudentListItem`/`StudentDetailPage`/`ImportStudentsPanel`은 기존과 동일하게 자동화 테스트 범위 밖 (빌드/린트 + 수동 스모크 테스트로 검증)
