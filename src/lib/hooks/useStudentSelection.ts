import { useCallback, useMemo, useState } from 'react'
import { selectionState, type SelectionState } from '../growth-garden/bulkGrowth'
import type { Student } from '../types'

/**
 * "선택 모드"와 선택된 학생 집합.
 *
 * 학생 객체가 아니라 id만 들고 있다 — 명단이 다시 불러와져 객체 참조가 바뀌어도
 * 선택이 풀리지 않고, 나중에 모둠·검색 결과처럼 다른 방식으로 고른 id 배열을
 * 그대로 넣기만 해도 같은 일괄 기록 흐름을 탈 수 있다.
 */
export function useStudentSelection(students: Student[]) {
  const [active, setActive] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // 명단에서 빠진 학생(삭제 등)이 선택에 남아 있지 않도록 항상 현재 명단으로 거른다.
  const selectedStudents = useMemo(
    () => students.filter((student) => selectedIds.has(student.id)),
    [students, selectedIds],
  )

  const selectedCount = selectedStudents.length
  const state: SelectionState = selectionState(selectedCount, students.length)

  const toggle = useCallback((studentId: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }, [])

  /** 현재 학급 명단 전체 — 다른 학급/삭제된 학생은 애초에 이 배열에 없다. */
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(students.map((student) => student.id)))
  }, [students])

  const clear = useCallback(() => setSelectedIds(new Set()), [])

  const enter = useCallback(() => setActive(true), [])

  /** 선택 모드 종료 — 선택 상태도 함께 비운다. */
  const exit = useCallback(() => {
    setActive(false)
    setSelectedIds(new Set())
  }, [])

  const isSelected = useCallback((studentId: string) => selectedIds.has(studentId), [selectedIds])

  return {
    active,
    selectedIds,
    selectedStudents,
    selectedCount,
    state,
    isSelected,
    toggle,
    selectAll,
    clear,
    enter,
    exit,
  }
}
