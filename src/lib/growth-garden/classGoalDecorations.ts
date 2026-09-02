import type { DecorationType } from '../types'

export const CLASS_GOAL_DECORATION_TYPES: DecorationType[] = [
  'stone_path', 'bench', 'pond', 'birdhouse', 'big_tree', 'bridge', 'fence', 'garden_lamp',
]

const LABELS: Record<DecorationType, string> = {
  stone_path: '돌길',
  bench: '정원 벤치',
  pond: '작은 연못',
  birdhouse: '새집',
  big_tree: '큰 나무',
  bridge: '작은 다리',
  fence: '울타리',
  garden_lamp: '정원등',
}

export function classGoalDecorationLabel(type: DecorationType) {
  return LABELS[type]
}
