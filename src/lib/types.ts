export type Student = {
  id: string
  teacher_id: string
  number: number
  name: string
  gender: string | null
  birthdate: string | null
  student_phone: string | null
  address: string | null
  father_name: string | null
  father_phone: string | null
  mother_name: string | null
  mother_phone: string | null
  emergency_contact: string | null
  note: string | null
  created_at: string
}

export type RecordCategory = '생활지도' | '학습' | '진로' | '학부모상담' | '기타'

export type StudentRecord = {
  id: string
  student_id: string
  teacher_id: string
  category: RecordCategory
  content: string
  record_date: string
  created_at: string
}

export type AttendanceStatus = '결석' | '지각' | '조퇴' | '결과'
export type AttendanceReasonCategory = '질병' | '미인정' | '인정' | '기타'

export type AttendanceEntry = {
  id: string
  student_id: string
  teacher_id: string
  date: string
  status: AttendanceStatus
  reason_category: AttendanceReasonCategory
  note: string | null
  created_at: string
  neis_entered: boolean
  document_received: boolean
}

export type AttendanceEntryWithStudent = AttendanceEntry & {
  students: { number: number; name: string } | null
}

export type WeeklyAttendanceBadge = {
  student_id: string
  number: number
  name: string
  status: AttendanceStatus
}

/** date는 'YYYYMMDD' */
export type WeeklyAttendanceDay = {
  date: string
  dayLabel: string
  entries: WeeklyAttendanceBadge[]
}

export type SearchRecord = Pick<StudentRecord, 'id' | 'student_id' | 'category' | 'content' | 'record_date'>
export type SearchAttendanceEntry = Pick<AttendanceEntry, 'id' | 'student_id' | 'status' | 'reason_category' | 'note' | 'date'>

export type StudentSearchResult = { student: Student; matches: Array<{ label: string; value: string }> }
export type RecordSearchResult = { record: SearchRecord; student: Student }
export type AttendanceSearchResult = { entry: SearchAttendanceEntry; student: Student }

export type SearchResults = {
  students: StudentSearchResult[]
  records: RecordSearchResult[]
  attendance: AttendanceSearchResult[]
}

export type SeatStatus = 'available' | 'empty' | 'disabled'
export type TeacherDirection = 'north' | 'south'
export type SeatGender = 'male' | 'female'
export type SeparationType = 'orthogonal' | 'diagonal'

export type Seat = {
  id: string
  row: number
  column: number
  status: SeatStatus
  genderSeat?: SeatGender
}

export type SeatAssignment = {
  student_id: string
  seat_id: string
  is_fixed: boolean
  source: 'manual' | 'automatic'
}

export type SeatSeparation = {
  student_a: string
  student_b: string
  type: SeparationType
}

export type PreviousSeatHistoryScope = 'latest1' | 'latest3' | 'currentSemester' | 'all'

export type SeatingPlan = {
  id: string
  teacher_id: string
  title: string
  plan_date: string
  rows: number
  columns: number
  teacher_direction: TeacherDirection
  seats: Seat[]
  assignments: SeatAssignment[]
  separations: SeatSeparation[]
  gender_balance: boolean
  avoid_past_neighbors: boolean
  avoid_previous_seats: boolean
  previous_seat_history_scope: PreviousSeatHistoryScope
  created_at: string
}

export type SchoolSettings = {
  teacher_id: string
  office_code: string
  school_code: string
  school_name: string
  school_year: string
  grade: string
  class_name: string
  updated_at: string
}

export type TimetablePeriod = {
  period: number
  subject: string
}

/** date는 'YYYYMMDD' */
export type TimetableByDate = Record<string, TimetablePeriod[]>

export type WeeklyTimetableDay = {
  date: string
  dayLabel: string
  periods: TimetablePeriod[]
}

export type MealInfo = {
  menus: string[]
  calorie: string
}

/** date는 'YYYYMMDD' */
export type MealByDate = Record<string, MealInfo>

export type WeeklyMealDay = {
  date: string
  dayLabel: string
  menus: string[]
  calorie: string
}

export type NeisSchoolSearchResult = {
  office_code: string
  school_code: string
  school_name: string
  address: string
}

export type SchoolEvent = {
  /** 'YYYYMMDD' */
  date: string
  name: string
  content: string
  type: string
  /** true면 grades는 무시 — 전교 대상이거나 NEIS가 대상 학년 정보를 주지 않은 경우 */
  isSchoolWide: boolean
  /** 학년 숫자 문자열, 예: ['6']. isSchoolWide가 true면 항상 빈 배열. */
  grades: string[]
}

/** date는 'YYYYMMDD' */
export type SchoolEventByDate = Record<string, SchoolEvent[]>

export type YorokColumnType = 'text' | 'checkbox'

export type YorokColumn = {
  id: string
  teacher_id: string
  label: string
  type: YorokColumnType
  position: number
  created_at: string
}

/**
 * `values`의 키는 YorokColumn.id — 컴파일 타임에 알 수 없는 런타임 정의 키셋이라
 * 이 파일의 다른 타입들과 달리 느슨하다. 텍스트 컬럼은 string, 체크박스 컬럼은
 * boolean. 학생이 아직 값을 입력하지 않은 컬럼은 키 자체가 없음(null이 아님).
 * 컴포넌트는 반드시 `values[column.id] ?? (column.type === 'checkbox' ? false : '')`
 * 형태로 접근해야 한다 — 컬럼이 사용자 정의라 생기는 의도된 트레이드오프.
 */
export type YorokEntry = {
  id: string
  student_id: string
  teacher_id: string
  values: Record<string, string | boolean>
  created_at: string
}

/**
 * 학급 성장정원(/apps/growth-garden)의 상점/벌점 기록 한 건.
 * 지금은 mock 서비스가 localStorage에 같은 모양으로 저장하고, 나중에
 * `growth_points` 테이블이 그대로 이 shape을 갖는다 (supabase/schema.sql 참고).
 */
export type GrowthPointType = 'merit' | 'demerit'

export type GrowthPointEntry = {
  id: string
  student_id: string
  teacher_id: string
  /** merit=상점, demerit=벌점 */
  type: GrowthPointType
  /** 항상 양수 크기 — 부호는 `type`이 결정한다(합산 로직 한 곳에만 부호가 존재). */
  amount: number
  reason: string
  created_at: string
}

/**
 * 성장정원의 보상 기록 — 상벌점(GrowthPointEntry)과 완전히 분리된 데이터다.
 * 보상을 줘도 학생의 성장 포인트는 차감되지 않는다(교사가 결과를 보고 따로 주는 기록).
 * 나중에 포인트 차감형으로 바꾸고 싶으면 여기에 cost 같은 컬럼을 더하면 된다.
 */
export type RewardScope = 'class' | 'student'

export type Reward = {
  id: string
  teacher_id: string
  scope: RewardScope
  /** scope가 'student'일 때만 채워진다. 학생 이름은 저장하지 않고 id만 참조한다. */
  student_id: string | null
  /** 조회를 단순하게 하려고 지급 월을 숫자로 함께 둔다(year 2026, month 8). */
  year: number
  month: number
  title: string
  description: string | null
  /** 지급일 'YYYY-MM-DD' */
  awarded_on: string
  created_at: string
}
