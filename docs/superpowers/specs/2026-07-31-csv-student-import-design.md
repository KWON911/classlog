# CSV 학생 명부 가져오기 설계

## 배경

교사가 학생을 한 명씩 수동으로 등록하는 대신, 엑셀 등에서 내보낸 CSV 파일로 학생 명부를 한 번에 가져올 수 있게 한다. 기존 학생 명부 화면(`StudentListPage`)에 기능을 추가하는 형태이며, 새로운 화면이나 라우트는 만들지 않는다.

## 범위

**포함**
- `학생 명부` 화면에 "CSV 가져오기" 버튼 추가
- 고정 열 순서의 CSV 파일 파싱: `출석번호,이름,성별,본인연락처,학부모연락처`
- UTF-8 / CP949(EUC-KR) 인코딩 자동 감지
- 가져오기 전 미리보기: 추가될 학생과 건너뛸 학생(사유 포함) 표시
- 유효성 검증(이름·출석번호 필수, 출석번호는 숫자) 및 중복 출석번호(기존 명부 + CSV 내부) 제외
- 확정 시 유효한 행만 일괄 등록

**제외**
- 열 매핑 UI (열 순서는 고정)
- 학생 정보 수정을 위한 CSV 가져오기(신규 등록만 지원, 기존 학생 갱신 없음)
- 생활기록/상담 기록 가져오기

## 데이터 형식

CSV는 헤더 유무와 무관하게 항상 다음 순서의 5개 열을 가진다. 헤더로 보이는 첫 줄(예: `출석번호,이름,...`처럼 첫 열이 숫자가 아닌 경우)은 자동으로 건너뛴다.

| 열 순서 | 필드 | 필수 여부 |
|---|---|---|
| 1 | 출석번호 | 필수, 숫자 |
| 2 | 이름 | 필수 |
| 3 | 성별 | 선택 |
| 4 | 본인 연락처 | 선택 |
| 5 | 학부모 연락처 | 선택 |

## 컴포넌트/코드 구조

```
src/
  lib/
    csv.ts                    CSV 파싱 + 인코딩 자동 감지 (순수 함수)
    hooks/
      useStudents.ts          addStudents(rows) 벌크 등록 메서드 추가
  components/
    ImportStudentsPanel.tsx   파일 선택 → 미리보기 → 가져오기 확정 UI
  routes/
    StudentListPage.tsx       "CSV 가져오기" 버튼 추가, ImportStudentsPanel 토글
```

### `src/lib/csv.ts`

```ts
export type ParsedStudentRow = {
  number: number
  name: string
  gender: string | null
  student_phone: string | null
  parent_phone: string | null
}

export type SkippedRow = {
  raw: string[]
  reason: string // '이름 없음' | '출석번호 없음' | '출석번호가 숫자가 아님' | '이미 명부에 있는 출석번호' | 'CSV 내 중복된 출석번호'
}

export function decodeCsvBytes(bytes: ArrayBuffer): string
// UTF-8로 먼저 디코딩 시도(TextDecoder fatal: true), 실패하면 CP949(EUC-KR)로 디코딩

export function parseStudentsCsv(
  text: string,
  existingNumbers: Set<number>,
): { valid: ParsedStudentRow[]; skipped: SkippedRow[] }
// 1) 줄 단위로 분리, 빈 줄 제외
// 2) 첫 줄의 첫 열이 숫자가 아니면 헤더로 간주하고 제외
// 3) 각 행을 파싱해 검증(이름/출석번호 필수, 출석번호 숫자)
// 4) 기존 명부(existingNumbers) 및 이번 파일 내에서 먼저 나온 출석번호와 중복이면 skipped 처리
// 5) 유효한 행은 valid에, 나머지는 사유와 함께 skipped에 담아 반환
```

인코딩 자동 감지는 `TextDecoder('utf-8', { fatal: true })`로 먼저 시도하고, 여기서 예외가 발생하면(엑셀이 기본으로 내보내는 CP949 바이트는 유효한 UTF-8이 아니므로 예외가 발생한다) `TextDecoder('euc-kr')`로 다시 디코딩한다.

### `useStudents` 훅 확장

```ts
addStudents(rows: NewStudent[]): Promise<{ inserted?: Student[]; error?: string }>
```
- `auth.getUser()`를 한 번만 호출해 `teacher_id`를 구한 뒤, `insert(rows.map(r => ({...r, teacher_id})))`로 한 번의 요청에 배열을 삽입한다(행마다 개별 요청을 보내지 않는다).
- 성공 시 반환된 행들을 기존 `students` 상태에 합치고 번호순으로 정렬한다.
- 실패 시 기존 `addStudent`와 동일하게 `error` 메시지를 상태와 반환값에 채운다.

### `ImportStudentsPanel` 컴포넌트

- `<input type="file" accept=".csv">`로 파일 선택
- 파일을 `ArrayBuffer`로 읽어 `decodeCsvBytes` → `parseStudentsCsv(text, existingNumbers)` 호출
  - `existingNumbers`는 `StudentListPage`가 이미 가진 `students` 목록에서 `number`만 뽑아 전달
- 결과를 표로 미리보기:
  - "추가될 학생 N명" 표 (번호·이름·성별·연락처)
  - "건너뛴 항목 M건" 표 (원본 행 + 사유)
- "가져오기" 버튼 클릭 시 `useStudents().addStudents(valid)` 호출, 성공하면 패널 닫힘

### `StudentListPage`

- 기존 "학생 추가" 버튼 옆에 "CSV 가져오기" 버튼 추가, 클릭 시 `ImportStudentsPanel` 토글(기존 `StudentForm` 토글과 동일한 패턴)
- 두 패널(추가 폼/가져오기 패널)은 동시에 하나만 열리도록 한다

## 에러 처리

- 파일을 읽지 못하거나 파싱 자체가 완전히 실패하면(예: 빈 파일, 5열 미만인 행이 전부인 경우) 패널 상단에 에러 메시지를 표시하고 미리보기를 진행하지 않는다
- `addStudents` 실패 시(네트워크/권한 오류 등) 기존 훅과 동일한 방식으로 에러 문구를 표시한다. 단일 insert 요청이므로 부분 성공은 없다(전부 성공하거나 전부 실패한다)

## 테스트 범위

- `src/lib/csv.ts`의 `decodeCsvBytes`, `parseStudentsCsv`에 대한 유닛 테스트를 추가한다: UTF-8/CP949 인코딩 판별, 헤더 유무, 이름/출석번호 누락, 출석번호가 숫자가 아닌 경우, 기존 명부와의 중복, CSV 내부 중복
- `useStudents`의 `addStudents`에 대한 유닛 테스트를 추가한다 (기존 `addStudent` 테스트와 동일한 목(mock) 패턴 사용)
- `ImportStudentsPanel`, `StudentListPage`의 UI 배선은 기존 MVP 설계와 동일하게 자동화 테스트 범위 밖으로 하고, 빌드/린트와 수동 스모크 테스트로 검증한다
