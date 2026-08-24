---
render_with_liquid: false
---

# 출결 날짜 선택을 캘린더로 통합 설계

## 배경

`/attendance` 페이지 상단의 날짜 선택은 현재 "N일" 형태의 `<select>` 드롭다운(그 달 평일만 옵션)이다. 페이지 하단에는 이미 그 달의 출결을 날짜별로 보여주는 읽기 전용 캘린더(`AttendanceCalendar`, 학급 전체 요약 위)가 있다. 드롭다운 대신 이 캘린더를 클릭 가능하게 만들어 날짜 선택기로 재사용하고, 페이지 맨 위로 옮긴다.

## 범위

**포함**
- `AttendanceCalendar`에 `selectedDate: string`, `onSelectDate: (date: string) => void` prop 추가. 각 날짜 셀을 클릭 가능한 버튼으로 바꾸고, 선택된 날짜는 파란 테두리 + 연한 파란 배경으로 강조
- `AttendancePage`에서 캘린더를 페이지 맨 위(월 이동 ◀/▶ 바로 아래)로 이동, 기존 "N일" `<select>` 드롭다운 제거
- 캘린더는 주말 셀 자체가 없으므로(기존 `buildWeeks` 로직 그대로) 주말은 자연히 선택 불가능 — `<select>`를 위해 추가했던 평일 필터링 목록(`days`)은 더 이상 필요 없어 제거

**제외**
- 캘린더 셀의 편집/삭제 기능 — 예외 입력·수정은 여전히 캘린더 아래(재배치 후에도 캘린더 바로 아래)의 학생 선택 그리드 + 입력 폼을 통해서만
- 캘린더 자체의 월 이동 UI — 페이지 상단에 이미 있는 ◀/▶를 그대로 공유(변경 없음)
- 캘린더 셀 안 예외 항목(사유+상태 라벨 박스) 자체의 클릭 동작 — 날짜 선택은 셀 전체(또는 날짜 숫자 영역) 클릭으로 이루어지며, 그 안의 개별 예외 박스를 따로 클릭했을 때의 동작은 정의하지 않는다(셀 클릭과 동일하게 그 날짜가 선택되면 충분)

## 컴포넌트 변경

### `AttendanceCalendar.tsx`

```tsx
type AttendanceCalendarProps = {
  yearMonth: string
  entries: AttendanceEntry[]
  students: Student[]
  selectedDate: string
  onSelectDate: (date: string) => void
}
```

- 날짜 셀을 감싸던 `<div className="min-h-20 rounded border border-gray-200 p-1 text-xs">`를 클릭 가능한 `<button type="button" onClick={() => onSelectDate(cell.date)}>`로 바꾼다(빈 칸 `null` 셀은 버튼 없이 그대로 빈 `<div>` 유지 — 클릭할 날짜가 없으므로).
- `cell.date === selectedDate`인 셀에는 `border-blue-600 bg-blue-50`을 추가로 적용해 강조한다.
- 예외 목록 렌더링(사유+상태 라벨, 학생 이름, 정렬)은 기존 로직 그대로 유지.

### `AttendancePage.tsx`

- 날짜 관련 헬퍼 중 `<select>`용으로 추가했던 `isWeekday`와 그걸 이용한 `days` 배열(129-131행)은 삭제한다. `firstWeekdayOfMonth`는 월 이동 시 `selectedDate`를 그 달 첫 평일로 맞추는 데 계속 쓰이므로 유지한다.
- `<select>` 블록(161-177행)을 제거한다.
- `<AttendanceCalendar>` 렌더링 위치를 현재의 학급 전체 요약 바로 위(220행)에서, 상단 월 이동 `<div>`(137-178행) 바로 다음으로 옮긴다. `selectedDate={selectedDate}`, `onSelectDate={(date) => { setSelectedDate(date); setEditingStudentId(null) }}`를 새로 전달한다 — 날짜가 바뀌면 열려있던 입력 폼을 닫는 기존 규칙(월 이동·기존 `<select>`의 `onChange`와 동일)을 그대로 지킨다.

## 영향받는 코드

- `src/components/AttendanceCalendar.tsx`: props 2개 추가, 셀을 버튼으로 변경, 선택 강조 스타일 추가
- `src/routes/AttendancePage.tsx`: `isWeekday`/`days` 제거, `<select>` 제거, `<AttendanceCalendar>` 위치 이동 및 새 props 전달

## 테스트

이 페이지/컴포넌트는 자동화 테스트가 없는 UI 파일이라(기존 컨벤션), `npm run build` + `npm run lint` + 수동 스모크 테스트로 검증한다.

수동 확인 항목:
- 페이지 맨 위, 월 이동 바로 아래에 캘린더가 나타나고 기존 "N일" 드롭다운은 사라졌는지
- 캘린더의 평일 셀을 클릭하면 그 날짜가 선택되어(파란 테두리+배경) 학생 선택 그리드가 그 날짜 기준으로 갱신되는지(예외 있는 학생 빨간색 표시가 바뀌는지)
- 열려있던 입력 폼이 다른 날짜 클릭 시 닫히는지(기존 동작)
- 월 이동(◀/▶) 시 캘린더도 새 달로 갱신되고, 선택된 날짜가 그 달 첫 평일로 자동 이동하며 캘린더에 강조 표시되는지
- 주말은 캘린더에 셀 자체가 없어 클릭할 수 없는지(기존 `buildWeeks` 동작 그대로)
- 학급 전체 요약 표(캘린더 아래, 위치 변경 없음)가 그대로 정상 동작하는지
