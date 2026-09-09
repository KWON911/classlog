# Google Form 누가기록 연동 설계

## 목표

`행동발달특성 누가기록_2026` Google Form의 기존·신규 응답을 Classlog 학생별 누가기록으로 가져온다. 설문의 `교사기록` 자유 입력만 기록 내용으로 사용하며, 설문의 관찰 체크 항목은 가져오지 않는다.

## 데이터 매핑

| Google Form 응답 | Classlog 기록 |
| --- | --- |
| 이름(복수 선택) | 선택된 각 학생의 `student_id` |
| 교사기록 | `content` |
| 제출 시각 | `record_date` (Asia/Seoul 날짜) |
| 카테고리 | UI에는 표시하지 않고 내부 필수값 `생활지도`으로 고정 |
| Google Form 응답 ID | 중복 방지용 외부 응답 ID |

- 현재 학급에는 동명이인이 없으므로 학생 이름을 교사 계정 안에서 정확히 하나의 학생으로 매칭한다.
- 교사기록이 비어 있거나 이름이 선택되지 않은 응답은 가져오지 않는다.
- 여러 학생을 선택한 응답은 선택한 학생마다 동일한 내용의 독립된 `records` 행을 만든다.

## 서버·DB 경계

- Google Apps Script는 `POST /api/google-form-record-import`로 응답 ID, 학생 이름 배열, 교사기록, 기록 날짜만 보낸다.
- API는 `Authorization: Bearer` 공유 비밀을 검증하고, 서버 환경변수의 고정 교사 ID를 사용한다. 요청 본문에는 교사 ID나 카테고리를 받지 않는다.
- API는 서버 전용 Supabase service-role key로 `import_google_form_record` RPC를 호출한다. 브라우저와 Apps Script에는 Supabase key를 전달하지 않는다.
- migration은 `google_form_record_imports` 테이블과 service-role 전용 RPC를 추가한다. RPC는 학생 이름 전체를 먼저 검증하고, 외부 응답 ID를 선점한 뒤 여러 학생의 기록을 한 트랜잭션으로 저장한다.
- 이미 저장된 응답 ID는 `duplicate`로 종료하므로 과거 응답 일괄 가져오기를 다시 실행해도 기록이 중복되지 않는다.

## Apps Script 운영

- Google Form에 연결된 Apps Script에서 설치형 제출 트리거를 등록해 새 응답을 전송한다.
- 같은 Script의 `backfillExistingResponses`는 `FormApp.getActiveForm().getResponses()`로 과거 응답을 같은 API에 전송한다.
- Script Properties에 공유 비밀만 저장한다. 저장소·Apps Script 코드·브라우저에는 service-role key를 넣지 않는다.
- 오류 응답은 Apps Script 실행 로그에 남기며, 이름 불일치나 누락된 환경변수는 API가 실패 상태로 반환한다.

## 사용자 설정 항목

Vercel 서버 환경변수에 다음 세 값을 설정해야 한다.

- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_FORM_RECORD_IMPORT_SECRET`
- `GOOGLE_FORM_RECORD_IMPORT_TEACHER_ID`

설문에 연결된 Apps Script의 Script Properties에는 동일한 `GOOGLE_FORM_RECORD_IMPORT_SECRET`를 설정해야 한다.

## 검증

- 순수 payload 검증 로직은 빈 내용·중복 이름·잘못된 날짜를 거부하고 정상 payload를 정규화하는 Vitest로 검증한다.
- migration은 기존 테이블을 삭제·재생성하지 않는 추가 전용 SQL이어야 한다.
- API는 공유 비밀, 필요한 환경변수, RPC 응답을 확인해 적절한 HTTP 응답을 낸다.
- lint와 production build를 실행한다. API와 migration의 실제 연결 검증은 Vercel 환경변수 설정 및 Supabase migration 적용 후 Apps Script의 과거 응답 가져오기로 수행한다.
