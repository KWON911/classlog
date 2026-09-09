# Google Form 누가기록: 처음부터 따라 하는 안내

Google Form에서 학생을 고르고 `교사기록`을 작성하면, 해당 학생의 Classlog 학급기록에 자동 저장됩니다.

- 설문의 체크 항목은 저장하지 않습니다.
- `교사기록`에 쓴 내용만 저장합니다.
- 여러 학생을 고르면 모든 학생에게 같은 내용이 저장됩니다.
- Classlog 카테고리는 자동으로 `생활지도`가 됩니다.

> 중요한 비밀번호·키는 Google Form 질문, 코드 파일, 채팅에 적지 않습니다.

## 처음 한 번만 설정하기

이미 자동 저장이 성공했다면 이 부분은 건너뛰고 **새 학년도에 학생이 바뀌면**부터 읽으세요.

### 1. Supabase에 연동 기능 넣기

1. Supabase에 로그인합니다.
2. Classlog 프로젝트를 엽니다.
3. 왼쪽 메뉴에서 **SQL Editor**를 누릅니다.
4. **New query**를 누릅니다.
5. `supabase/migrations/20260909_google_form_record_import.sql` 파일을 엽니다.
6. 파일 안의 내용을 전부 복사해 SQL Editor에 붙여넣습니다.
7. **Run**을 누릅니다.

이 작업은 처음 한 번만 합니다. `schema.sql`은 다시 실행하지 않습니다.

### 2. Vercel에 값 3개 넣기

1. Vercel에 로그인합니다.
2. **classlog** 프로젝트를 누릅니다.
3. 위쪽의 **Settings**를 누릅니다.
4. 왼쪽의 **Environment Variables**를 누릅니다.
5. 아래 값을 한 줄씩 추가합니다. 환경은 모두 **Production**을 선택합니다.

| 입력 이름 | 넣을 값 |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **Project Settings → API Keys**의 `service_role` 키 |
| `GOOGLE_FORM_RECORD_IMPORT_SECRET` | 직접 만든 긴 비밀문자열 하나 |
| `GOOGLE_FORM_RECORD_IMPORT_TEACHER_ID` | Supabase **Authentication → Users**에서 내 계정의 **User UID** |

`GOOGLE_FORM_RECORD_IMPORT_TEACHER_ID`에는 이메일을 넣지 않습니다. `teacher@example.com`이 아니라 `12345678-abcd-1234-abcd-123456789012`처럼 하이픈이 있는 긴 ID를 넣어야 합니다.

값을 모두 저장한 뒤 **Deployments**에서 새 배포를 한 번 실행합니다.

### 3. Google Form에 연결하기

1. 누가기록 Google Form의 **편집 화면**을 엽니다.
2. 위쪽 메뉴에서 **확장 프로그램 → Apps Script**를 누릅니다.
3. 기본으로 적힌 코드를 모두 지웁니다.
4. 이 폴더의 `Code.gs` 파일 내용을 전부 복사해 붙여넣습니다.
5. 저장 버튼을 누릅니다.
6. 왼쪽 톱니바퀴 **프로젝트 설정**을 누릅니다.
7. 아래의 **스크립트 속성**에서 **스크립트 속성 추가**를 누릅니다.
8. 이름에 `GOOGLE_FORM_RECORD_IMPORT_SECRET`를 입력합니다.
9. 값에는 Vercel의 같은 이름 환경변수와 **완전히 같은 비밀문자열**을 입력하고 저장합니다.
10. 위쪽 함수 목록에서 `installFormSubmitTrigger`를 고른 뒤 **실행**을 누릅니다.
11. Google 권한 요청이 나오면 화면 안내에 따라 허용합니다.

### 4. 이전 설문 응답 가져오기

1. Apps Script 위쪽 함수 목록에서 `backfillExistingResponses`를 고릅니다.
2. **실행**을 누릅니다.
3. 아래쪽 **실행 로그**에 빨간 오류가 없으면 완료입니다.

오류를 고친 뒤 이 함수를 다시 실행해도, 이미 가져온 응답은 중복 저장되지 않습니다.

### 5. 마지막 확인

1. Google Form에서 학생 한 명을 선택합니다.
2. `교사기록`에 `연동 확인용 기록`을 입력해 제출합니다.
3. Classlog에서 해당 학생의 **학급기록**을 엽니다.
4. 오늘 날짜와 `연동 확인용 기록`이 보이면 성공입니다.

## 새 학년도에 학생이 바뀌면

### 가장 쉬운 방법: 현재 Form 계속 사용하기

1. Google Form 편집 화면에서 `이름` 질문을 누릅니다.
2. 기존 학생 이름을 새 학급 학생 이름으로 바꿉니다.
3. Form 제목의 학년도만 새 학년도에 맞게 고칩니다.

이 경우 Apps Script, Vercel, Supabase는 다시 설정하지 않습니다.

### Form을 새로 만들고 싶은 경우

1. 새 Form을 만듭니다.
2. 질문 제목을 반드시 `이름`, `교사기록`으로 만듭니다.
3. 새 Form에서 **확장 프로그램 → Apps Script**를 엽니다.
4. `Code.gs`를 붙여넣고 저장합니다.
5. **프로젝트 설정 → 스크립트 속성**에 기존과 같은 `GOOGLE_FORM_RECORD_IMPORT_SECRET`를 넣습니다.
6. `installFormSubmitTrigger`를 한 번 실행합니다.

Vercel과 Supabase는 다시 설정하지 않습니다.

## 오류가 나면

| 오류 | 확인할 것 |
| --- | --- |
| `401 인증에 실패했습니다.` | Vercel과 Apps Script의 비밀문자열이 같은지 확인합니다. |
| `422 학생 기록을 가져오지 못했습니다.` | Form 학생 이름과 Classlog 학생 이름이 같은지, 교사 ID에 이메일이 아닌 User UID를 넣었는지 확인합니다. |
| `500 Google Form 연동 서버 설정이 완료되지 않았습니다.` | Vercel 환경변수 3개를 모두 넣었는지 확인하고 새 배포를 실행합니다. |
| `invalid input syntax for type uuid` | 교사 ID 칸에 이메일을 넣은 경우입니다. Supabase의 User UID로 바꿉니다. |
