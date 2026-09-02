/** 성장 기록 저장 뒤 독립된 공동 목표 화면도 다시 계산하도록 알리는 브라우저 이벤트. */
export const CLASS_GARDEN_GOAL_REFRESH_EVENT = 'class-garden-goal-refresh'

export function dispatchClassGardenGoalRefresh() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CLASS_GARDEN_GOAL_REFRESH_EVENT))
}
