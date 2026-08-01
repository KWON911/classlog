# 출결 월간 캘린더 뷰 설계

## 배경

`/attendance` 페이지는 현재 (1) 선택한 날짜의 학생별 출결 입력 그리드, (2) 학생별 상태 카운트를 보여주는 "학급 전체 요약" 표, 두 섹션으로 구성되어 있다. 교사가 그 달에 어떤 날짜에 무슨 일이 있었는지 한눈에(달력 형태로) 보고 싶어 해서, 요약 표 위에 월간 캘린더 뷰를 추가한다.

사용자가 참고로 첨부한 스크린샷은 다른 학교 시스템(나이스 등으로 추정)의 캘린더 화면으로, "교외"(교외체험학습으로 추정) 같은 이 앱에 없는 카테고리를 포함하고 있었다. 논의 결과 "교외"라는 단어는 이 앱에 도입하지 않고, 기존 데이터 모델(상태 4종 x 사유 4종)만으로 표현하기로 했다 — 교외체험학습 같은 경우는 교사가 사유를 "인정"으로 선택해 입력하면 된다.

## 범위

**포함**
- `/attendance` 페이지의 "학급 전체 요약" 표 바로 위에 월간 캘린더 뷰 추가
- 월~금 5개 요일 열, 그 달의 날짜를 요일에 맞게 배치(토/일 제외, 첫 주 시작 요일 앞은 빈 칸)
- 각 날짜 셀에는 그 날 출결 예외가 있는 학생들을 "사유+상태" 라벨(예: "질병결석", "인정결석", "질병지각") + 학생 이름 박스로 나열
- 새 컴포넌트 `src/components/AttendanceCalendar.tsx`로 분리, `AttendancePage`가 이미 갖고 있는 `yearMonth`/`entries`를 그대로 전달(새 쿼리 없음)

**제외**
- "교외" 같은 새 카테고리/라벨 도입 — 기존 상태(결석/지각/조퇴/결과) x 사유(질병/미인정/인정/기타) 조합만 사용
- 캘린더 셀의 클릭/편집 상호작용(읽기 전용 뷰) — 편집은 기존처럼 상단 날짜별 입력 그리드를 통해서만
- 토/일 열 표시(학교 출결은 평일에만 발생하므로 5열 고정)
- 캘린더 자체의 월 이동 UI — 페이지 상단에 이미 있는 월 이동(◀/▶)을 그대로 공유

## 컴포넌트 설계

```tsx
type AttendanceCalendarProps = {
  yearMonth: string
  entries: AttendanceEntry[]
  students: Student[]
}
export function AttendanceCalendar({ yearMonth, entries, students }: AttendanceCalendarProps)
```

- `AttendancePage.tsx`는 "학급 전체 요약" 표 바로 위에 `<AttendanceCalendar yearMonth={yearMonth} entries={entries} students={students} />`를 렌더링하기만 하면 된다. `yearMonth`/`entries`는 `useAttendance(yearMonth)`에서, `students`는 `useStudents()`에서 이미 가져온 값을 그대로 재사용한다.
- 컴포넌트 내부에서 `entries`를 날짜별로 그룹핑한다(`Map<string, AttendanceEntry[]>`, 키는 `entry.date`). 이번 달 범위 밖 데이터는 애초에 `entries`에 포함되지 않으므로 추가 필터링이 필요 없다.
- 요일 그리드 계산: 1일부터 그 달 마지막 날까지 순회하며 각 날짜의 요일(`Date.getDay()`)을 구해 토(6)/일(0)은 건너뛰고, 월요일(1)마다 새 주(행)를 시작한다. 첫 주의 앞부분(그 달 1일 이전 요일 칸)은 빈 칸으로 채운다.
- 각 날짜 셀은 그 날짜에 해당하는 예외 목록을 세로로 나열한다. 라벨은 `${entry.reason_category}${entry.status}` 형태로 이어붙인 텍스트(예: "질병" + "결석" → "질병결석")이고, 그 아래 학생 이름을 표시한다. 학생 이름은 `entries`에 없는 `student_id → name` 매핑이 필요하므로, `AttendancePage`가 이미 갖고 있는 `students` 목록도 함께 props로 전달한다(`students: Student[]`).
- 예외가 없는 날짜 셀은 비어 있다. 상호작용(클릭 등)은 없다.

## 영향받는 코드

- `src/components/AttendanceCalendar.tsx` (신규): 캘린더 그리드 계산 + 렌더링
- `src/routes/AttendancePage.tsx`: "학급 전체 요약" `<h2>` 바로 위에 `<AttendanceCalendar yearMonth={yearMonth} entries={entries} students={students} />` 한 줄 추가. 다른 로직 변경 없음.

## 테스트

이 컴포넌트는 자동화 테스트가 없는 UI 컴포넌트라(기존 컨벤션 — `src/routes/`, `src/components/`는 build+lint+수동 스모크로 검증), `npm run build` + `npm run lint` + 수동 스모크 테스트로 검증한다.

수동 확인 항목:
- 그 달의 날짜가 요일에 맞게 월~금 5열로 정렬되는지(1일이 어느 요일이든 첫 주 앞 빈 칸이 올바른지)
- 예외 기록이 있는 날짜 셀에 "사유+상태" 라벨과 학생 이름이 올바르게 표시되는지, 없는 날짜는 비어 있는지
- 한 날짜에 여러 학생의 예외가 있을 때 모두 세로로 나열되는지
- 월 이동(페이지 상단 ◀/▶) 시 캘린더도 함께 새 달 데이터로 갱신되는지(별도 상태 없이 `yearMonth`/`entries` props를 그대로 받으므로 자동으로 갱신되어야 함)
