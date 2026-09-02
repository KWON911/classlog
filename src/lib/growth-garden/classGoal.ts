import type {
  ClassGardenUnlock,
  ClassGoal,
  ClassGoalMilestone,
  GrowthPointEntry,
} from '../types'
import { monthRange, type YearMonth } from './monthlyReport'

export type ClassGoalMilestoneState = ClassGoalMilestone & {
  reached: boolean
  unlocked: boolean
}

export type ClassGoalProgress = {
  score: number
  currentScore: number
  target: number
  targetPoint: number
  nextMilestone: ClassGoalMilestone | null
  completed: boolean
  isComplete: boolean
  completion: boolean
  milestones: ClassGoalMilestoneState[]
  reachedMilestones: ClassGoalMilestone[]
  unlockedMilestones: ClassGoalMilestone[]
  unreachedMilestones: ClassGoalMilestone[]
  newlyReachableMilestones: ClassGoalMilestone[]
}

/** Returns a Korean UI-ready validation message, or null when valid. */
export function validateClassGoalMilestones(
  milestones: ClassGoalMilestone[],
  targetPoint?: number,
): string | null {
  if (milestones.length < 3 || milestones.length > 5) return '공동 목표 단계는 3~5개로 설정해 주세요.'

  const decorations = new Set<string>()
  for (let index = 0; index < milestones.length; index += 1) {
    const milestone = milestones[index]
    if (!Number.isInteger(milestone.point) || milestone.point <= 0) {
      return '단계 점수는 양의 정수로 입력해 주세요.'
    }
    if (index > 0 && milestone.point <= milestones[index - 1].point) {
      return '단계 점수는 엄격히 오름차순이어야 합니다.'
    }
    if (decorations.has(milestone.decorationType)) return '장식 종류는 중복해서 선택할 수 없습니다.'
    decorations.add(milestone.decorationType)
  }

  if (targetPoint !== undefined && milestones[milestones.length - 1].point > targetPoint) {
    return '마지막 단계 점수는 최종 목표 점수보다 클 수 없습니다.'
  }
  return null
}

export function classGoalScore(
  entries: GrowthPointEntry[],
  studentIds: Set<string>,
  yearMonth: YearMonth,
): number {
  const { start, end } = monthRange(yearMonth)
  return entries.reduce((total, entry) => {
    if (entry.type !== 'merit' || !studentIds.has(entry.student_id)) return total
    const at = new Date(entry.created_at)
    return !Number.isNaN(at.getTime()) && at >= start && at < end ? total + entry.amount : total
  }, 0)
}

export function buildClassGoalProgress(
  goal: ClassGoal,
  score: number,
  existingUnlocks: ClassGardenUnlock[] = [],
): ClassGoalProgress {
  const unlockedTypes = new Set(existingUnlocks.map((unlock) => unlock.decoration_type))
  const milestones = goal.milestones.map((milestone) => {
    const unlocked = unlockedTypes.has(milestone.decorationType)
    return { ...milestone, unlocked, reached: unlocked || score >= milestone.point }
  })
  const reachedMilestones = milestones.filter((milestone) => milestone.reached).map(({ point, decorationType }) => ({ point, decorationType }))
  const unlockedMilestones = milestones.filter((milestone) => milestone.unlocked).map(({ point, decorationType }) => ({ point, decorationType }))
  const unreachedMilestones = milestones.filter((milestone) => !milestone.reached).map(({ point, decorationType }) => ({ point, decorationType }))
  const newlyReachableMilestones = milestones
    .filter((milestone) => !milestone.unlocked && score >= milestone.point)
    .map(({ point, decorationType }) => ({ point, decorationType }))
  const nextMilestone = milestones.find((milestone) => !milestone.reached)
  const completed = score >= goal.target_point

  return {
    score,
    currentScore: score,
    target: goal.target_point,
    targetPoint: goal.target_point,
    nextMilestone: nextMilestone ? { point: nextMilestone.point, decorationType: nextMilestone.decorationType } : null,
    completed,
    isComplete: completed,
    completion: completed,
    milestones,
    reachedMilestones,
    unlockedMilestones,
    unreachedMilestones,
    newlyReachableMilestones,
  }
}
