# 출결 학급 요약 표 - 학생별 상세 기록 펼치기 설계

## 배경

`/attendance` 페이지 하단의 "학급 전체 요약" 표는 학생별 상태 카운트(결석/지각/조퇴/결과 횟수)만 보여준다. 교사가 어떤 날짜에 무슨 일이 있었는지 확인하려면 매번 날짜를 하나씩 넘겨가며 찾아야 한다. 학생 이름을 클릭하면 그 달의 날짜별 상세 기록(상태·사유·메모)을 바로 아래에 펼쳐 보여주는 기능을 추가한다.

## 범위

**포함**
- 학급 요약 표에서 학생 이름 클릭 시 해당 행 아래에 그 달의 출결 예외 기록을 날짜순으로 펼쳐서 표시(아코디언)
- 여러 학생을 동시에 펼쳐둘 수 있음
- 각 기록은 날짜, 상태, 사유, 메모(있는 경우)를 표시
- 기록이 없는 학생을 펼치면 "이번 달 기록 없음" 표시

**제외**
- 새로운 데이터 조회(이미 `useAttendance(yearMonth)`가 그 달의 전체 `entries`를 갖고 있음 — 필터링만 하면 됨)
- 펼친 상세 기록에서 바로 수정/삭제하는 기능(수정은 기존처럼 상단의 날짜별 입력 UI를 통해서만)
- 월 경계를 넘는 기록 조회(현재 선택된 `yearMonth` 범위 내 기록만)

## UI / 동작

`AttendancePage.tsx`의 요약 표(`<table>`) 안, 학생 이름 셀(`<td>`)을 클릭 가능한 버튼으로 바꾼다. 이름 앞에 펼침 상태를 나타내는 화살표(▸ 닫힘 / ▾ 펼침)를 붙인다.

```
학생          결석  지각  조퇴  결과
▸ 3. 김철수    2    1    0    0
    8/5 결석(질병) - 병원 진료
    8/12 지각(미인정)
  4. 박서연     0    0    0    0
```

클릭 시 펼쳐지는 영역은 해당 학생 행 바로 다음에 추가 행(`<tr>`)으로 렌더링하며, 그 달의 예외 기록을 날짜 오름차순으로 나열한다. 각 줄은 `M/D 상태(사유)` 형식이고, `note`가 있으면 ` - 메모` 형태로 이어붙인다. 예외 기록이 하나도 없으면(카운트가 전부 0이면) "이번 달 기록 없음" 한 줄을 표시한다.

## 상태 관리

기존 `editingStudentId`(상단 날짜별 입력 UI, 한 번에 하나만 열림)와는 별개로 요약 표 전용 상태를 추가한다:

```ts
const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(new Set())
```

이름 클릭 시 해당 학생 id를 토글(Set에 있으면 제거, 없으면 추가)한다 — 여러 학생을 동시에 펼쳐둘 수 있다.

`editingStudentId`(날짜별 입력 UI)와 달리, 월 이동(◀/▶) 시 `expandedStudentIds`는 초기화하지 않는다. 이 상태는 읽기 전용 표시일 뿐 특정 날짜에 쓰기 작업을 하는 게 아니므로 스테일 데이터로 잘못 저장될 위험이 없다 — 펼쳐진 학생은 월을 이동해도 계속 펼쳐진 채로 남아있고, 내용물(`entriesByStudent`)만 새 달의 데이터로 자동 갱신된다(기록이 없으면 "이번 달 기록 없음"으로 바뀐다).

## 데이터

새 쿼리나 훅 변경 없이, 이미 `useAttendance(yearMonth)`가 반환하는 `entries`를 학생별로 그룹핑·정렬한 파생 데이터를 `useMemo`로 만든다:

```ts
const entriesByStudent = useMemo(() => {
  const map = new Map<string, typeof entries>()
  for (const entry of entries) {
    const list = map.get(entry.student_id) ?? []
    list.push(entry)
    map.set(entry.student_id, list)
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.date.localeCompare(b.date))
  }
  return map
}, [entries])
```

기존 `entryByStudentAndDate`(날짜별 입력 UI가 특정 날짜의 단일 예외를 조회할 때 사용)와 `summaryByStudent`(카운트 집계)는 그대로 유지하고, `entriesByStudent`는 이번 기능 전용으로 새로 추가한다.

## 영향받는 코드

- `src/routes/AttendancePage.tsx`: `expandedStudentIds` 상태, `entriesByStudent` 파생 데이터, 요약 표의 학생 이름 셀을 토글 버튼으로 변경, 펼침 상세 행 렌더링 추가. 이 파일 하나만 수정하며 새 컴포넌트나 훅은 필요 없다.

## 테스트

이 기능은 `AttendancePage.tsx`(라우트 파일)만 수정하는 UI 로직으로, 기존 컨벤션(컴포넌트/라우트는 자동화 테스트 없이 `npm run build` + `npm run lint` + 수동 스모크 테스트로 검증)을 따른다. 별도 훅이나 순수 로직 모듈을 새로 만들지 않으므로 신규 자동화 테스트는 없다.

수동 확인 항목:
- 예외 기록이 있는 학생 이름 클릭 → 날짜순으로 정렬된 기록이 펼쳐지는지, 메모가 있는/없는 행이 올바르게 표시되는지
- 기록이 없는 학생(카운트 전부 0) 클릭 → "이번 달 기록 없음" 표시
- 여러 학생을 동시에 펼쳤을 때 서로 간섭 없이 독립적으로 펼침/닫힘 유지
- 월을 이동(◀/▶)했을 때 펼쳐진 상태는 유지된 채로 내용물만 새 달의 데이터로 올바르게 갱신되는지
