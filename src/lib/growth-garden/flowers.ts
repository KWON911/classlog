export const FLOWER_TYPES = ['tulip', 'sunflower', 'daisy', 'cosmos', 'rose', 'lily'] as const

export type FlowerType = (typeof FLOWER_TYPES)[number]

export function flowerForStudent(studentId: string): FlowerType {
  let hash = 0

  for (let index = 0; index < studentId.length; index += 1) {
    hash = (hash * 31 + studentId.charCodeAt(index)) | 0
  }

  return FLOWER_TYPES[(hash >>> 0) % FLOWER_TYPES.length]
}

/** 현재 성장 사이클의 꽃. 첫 사이클은 기존 학생별 꽃 배정을 그대로 유지한다. */
export function flowerForCycle(studentId: string, cycleNumber: number): FlowerType {
  if (cycleNumber <= 1) return flowerForStudent(studentId)

  const previous = flowerForCycle(studentId, cycleNumber - 1)
  const candidate = flowerForStudent(`${studentId}:${cycleNumber}`)
  if (candidate !== previous) return candidate

  return FLOWER_TYPES[(FLOWER_TYPES.indexOf(candidate) + 1) % FLOWER_TYPES.length]
}
