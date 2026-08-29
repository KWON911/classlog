/**
 * 성장정원 데이터 접근 계약.
 *
 * 화면과 훅은 이 인터페이스만 알고, 구현체(mock/Supabase)는 services/index.ts가
 * 고른다. 반환 shape `{ data?, error? }`는 프로젝트의 Supabase 훅들과 동일하게
 * 맞춰 두었다 — 나중에 구현체를 갈아끼워도 호출부 수정이 없도록.
 */
import type { GrowthPointEntry, GrowthPointType } from '../../types'

export type NewGrowthPointEntry = {
  student_id: string
  type: GrowthPointType
  /** 양수 크기 */
  amount: number
  reason: string
}

export type GrowthGardenService = {
  /** 담당 학급 전체의 기록. 정렬은 호출부(순수 로직)가 담당한다. */
  listEntries(): Promise<{ data?: GrowthPointEntry[]; error?: string }>
  addEntry(input: NewGrowthPointEntry): Promise<{ data?: GrowthPointEntry; error?: string }>
  deleteEntry(id: string): Promise<{ error?: string }>
  /** 한 학생의 기록 전체 삭제(정원 되돌리기) */
  clearStudent(studentId: string): Promise<{ error?: string }>
}
