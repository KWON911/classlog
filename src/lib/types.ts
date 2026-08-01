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
