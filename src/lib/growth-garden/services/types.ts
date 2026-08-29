/**
 * 성장정원 데이터 접근 계약.
 *
 * 화면과 훅은 이 인터페이스만 알고, 구현체(mock/Supabase)는 services/index.ts가
 * 고른다. 반환 shape `{ data?, error? }`는 프로젝트의 Supabase 훅들과 동일하게
 * 맞춰 두었다 — 나중에 구현체를 갈아끼워도 호출부 수정이 없도록.
 */
import type { GrowthPointEntry, GrowthPointType, MonthlyAward, Reward, RewardScope } from '../../types'

export type NewGrowthPointEntry = {
  student_id: string
  type: GrowthPointType
  /** 양수 크기 */
  amount: number
  reason: string
}

/** created_at 기준 [from, to) 범위. 월별 리포트가 필요한 만큼만 가져오려고 쓴다. */
export type EntryRange = { from?: string; to?: string }

export type NewReward = {
  scope: RewardScope
  student_id?: string | null
  year: number
  month: number
  title: string
  description?: string | null
  awarded_on: string
}

export type RewardService = {
  listRewards(year: number, month: number): Promise<{ data?: Reward[]; error?: string }>
  createReward(input: NewReward): Promise<{ data?: Reward; error?: string }>
  deleteReward(id: string): Promise<{ error?: string }>
}

export type NewMonthlyAward = {
  student_id: string
  year: number
  month: number
  monthly_growth: number
  title: string
  reward_title: string
  reward_description?: string | null
  awarded_on: string
}

export type MonthlyAwardUpdate = Partial<Omit<NewMonthlyAward, 'student_id' | 'year' | 'month'>>

export type MonthlyAwardService = {
  listAwards(year: number, month: number): Promise<{ data?: MonthlyAward[]; error?: string }>
  createAward(input: NewMonthlyAward): Promise<{ data?: MonthlyAward; error?: string }>
  updateAward(id: string, input: MonthlyAwardUpdate): Promise<{ data?: MonthlyAward; error?: string }>
  deleteAward(id: string): Promise<{ error?: string }>
}

export type GrowthGardenService = {
  /** 담당 학급 전체의 기록(범위를 주면 그만큼만). 정렬은 호출부(순수 로직)가 담당한다. */
  listEntries(range?: EntryRange): Promise<{ data?: GrowthPointEntry[]; error?: string }>
  addEntry(input: NewGrowthPointEntry): Promise<{ data?: GrowthPointEntry; error?: string }>
  deleteEntry(id: string): Promise<{ error?: string }>
  /** 한 학생의 기록 전체 삭제(정원 되돌리기) */
  clearStudent(studentId: string): Promise<{ error?: string }>
  /** 담당 학급 전체의 기록 삭제 — 학기 초 초기화용. 되돌릴 수 없다. */
  clearClass(): Promise<{ error?: string }>
}
