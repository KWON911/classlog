export const ADMIN_EMAIL = 'dosung83@gmail.com'

export type ManagedAccount = {
  teacher_id: string
  email: string
  student_count: number
  record_count: number
  attendance_count: number
  seating_plan_count: number
  has_school_settings: boolean
}

export function isAdminEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() === ADMIN_EMAIL
}
