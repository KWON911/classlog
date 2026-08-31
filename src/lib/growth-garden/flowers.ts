export const FLOWER_TYPES = ['tulip', 'sunflower', 'daisy', 'cosmos', 'rose', 'lily'] as const

export type FlowerType = (typeof FLOWER_TYPES)[number]

export function flowerForStudent(studentId: string): FlowerType {
  let hash = 0

  for (let index = 0; index < studentId.length; index += 1) {
    hash = (hash * 31 + studentId.charCodeAt(index)) | 0
  }

  return FLOWER_TYPES[(hash >>> 0) % FLOWER_TYPES.length]
}
