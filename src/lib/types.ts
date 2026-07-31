export type Student = {
  id: string
  teacher_id: string
  number: number
  name: string
  gender: string | null
  student_phone: string | null
  parent_phone: string | null
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
