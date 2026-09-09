export function getRemainingDirtyIds(
  dirtyIds: Set<string>,
  savedIds: Set<string>,
  savedDraft: Map<string, Record<string, string | boolean>>,
  currentDraft: Map<string, Record<string, string | boolean>>,
) {
  return new Set(
    [...dirtyIds].filter((studentId) => !savedIds.has(studentId) || currentDraft.get(studentId) !== savedDraft.get(studentId)),
  )
}
