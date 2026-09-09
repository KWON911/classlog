# Google Form 누가기록 연동 설정

대상 Form: `행동발달특성 누가기록_2026`

이 연동은 `이름`에서 선택한 모든 학생에게 `교사기록` 내용만 Classlog 생활기록으로 저장한다. 관찰 체크 항목은 가져오지 않으며, Classlog 내부 카테고리는 `생활지도`로 고정된다.

## 1. Supabase migration 적용

Supabase Dashboard의 SQL Editor에서 `supabase/migrations/20260909_google_form_record_import.sql` 전체를 실행한다. 기존 `schema.sql`을 다시 실행하지 않는다.

## 2. Vercel 환경변수 설정

Vercel 프로젝트의 Production 환경변수에 다음을 추가한 뒤 새 배포를 만든다.

| 환경변수 | 값 |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 프로젝트의 service-role key |
| `GOOGLE_FORM_RECORD_IMPORT_SECRET` | 충분히 긴 임의 문자열 |
| `GOOGLE_FORM_RECORD_IMPORT_TEACHER_ID` | Classlog를 사용하는 교사 계정의 Supabase Auth 사용자 UUID |

`SUPABASE_SERVICE_ROLE_KEY`와 `GOOGLE_FORM_RECORD_IMPORT_SECRET`는 `VITE_` 접두사를 붙이면 안 되며, 브라우저·저장소·Form 항목에 입력하면 안 된다.

## 3. Google Form Apps Script 설정

1. 대상 Google Form 편집 화면에서 **확장 프로그램 → Apps Script**를 연다.
2. 기본 파일의 내용을 지우고 `Code.gs` 내용을 붙여넣고 저장한다.
3. 프로젝트 설정의 **스크립트 속성**에 다음 속성을 추가한다.
   - 이름: `GOOGLE_FORM_RECORD_IMPORT_SECRET`
   - 값: Vercel의 같은 이름 환경변수 값
4. 함수 목록에서 `installFormSubmitTrigger`를 선택해 한 번 실행하고 Google 권한 요청을 승인한다.
5. 함수 목록에서 `backfillExistingResponses`를 한 번 실행해 기존 응답을 가져온다.

## 4. 확인 방법

1. 설문에서 학생 한 명 이상을 선택하고 `교사기록`에 테스트 문장을 입력해 제출한다.
2. Classlog의 해당 학생 생활기록에서 제출 날짜·내용을 확인한다.
3. Apps Script 실행 로그에 오류가 없는지 확인한다.
4. `backfillExistingResponses`를 다시 실행해도 같은 설문 응답이 중복 저장되지 않는지 확인한다.

### 문제 해결

- `401 인증에 실패했습니다.`: Vercel과 Script Properties의 공유 비밀 값이 다르다.
- `422 학생 기록을 가져오지 못했습니다.`: 설문 이름과 Classlog 학생 이름이 일치하는지, migration을 적용했는지 확인한다.
- `500 Google Form 연동 서버 설정이 완료되지 않았습니다.`: Vercel 환경변수 설정 후 새 배포가 필요하다.
