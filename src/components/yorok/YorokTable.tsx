import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { GripVertical, Pencil, X } from 'lucide-react'
import { useYorokColumns } from '../../lib/hooks/useYorokColumns'
import { useYorokEntries } from '../../lib/hooks/useYorokEntries'
import type { Student, YorokColumn, YorokEntry } from '../../lib/types'
import { fieldClass, textareaClass } from '../../lib/ui/classNames'
import { UnsetState } from '../home/HomeCardStates'
import { ConfirmDialog } from '../ConfirmDialog'
import { AddYorokColumnControl } from './AddYorokColumnControl'

type YorokTableProps = {
  students: Student[]
  studentsLoading: boolean
}

export function YorokTable({ students, studentsLoading }: YorokTableProps) {
  const {
    columns,
    loading: columnsLoading,
    error: columnsError,
    addColumn,
    deleteColumn,
    renameColumn,
    reorderColumns,
  } = useYorokColumns()
  const { entries, loading: entriesLoading, error: entriesError, saveEntryValues } = useYorokEntries()

  const entryByStudent = useMemo(() => {
    const map = new Map<string, YorokEntry>()
    for (const entry of entries) map.set(entry.student_id, entry)
    return map
  }, [entries])

  const [draft, setDraft] = useState<Map<string, Record<string, string | boolean>>>(new Map())
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageIsError, setMessageIsError] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<YorokColumn | null>(null)
  const [deletingColumn, setDeletingColumn] = useState(false)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)

  // entries/students가 바뀌면(최초 로드, 저장 후 등) draft를 저장된 값으로 재시딩.
  useEffect(() => {
    const next = new Map<string, Record<string, string | boolean>>()
    for (const student of students) {
      next.set(student.id, { ...(entryByStudent.get(student.id)?.values ?? {}) })
    }
    setDraft(next)
    setDirtyIds(new Set())
  }, [students, entryByStudent])

  const orderedStudents = useMemo(() => [...students].sort((a, b) => a.number - b.number), [students])

  const updateCell = (studentId: string, columnId: string, value: string | boolean) => {
    setDraft((prev) => {
      const next = new Map(prev)
      next.set(studentId, { ...(next.get(studentId) ?? {}), [columnId]: value })
      return next
    })
    setDirtyIds((prev) => new Set(prev).add(studentId))
  }

  const handleSave = async () => {
    if (dirtyIds.size === 0) return
    setSaving(true)
    const results = await Promise.all(
      [...dirtyIds].map((studentId) => saveEntryValues(studentId, draft.get(studentId) ?? {})),
    )
    setSaving(false)

    const failed = results.filter((r) => r.error)
    if (failed.length > 0) {
      setMessage(`${failed.length}건 저장에 실패했습니다. 다시 시도해 주세요.`)
      setMessageIsError(true)
      return
    }
    setDirtyIds(new Set())
    setMessage('변경사항을 저장했습니다.')
    setMessageIsError(false)
  }

  const startRename = (column: YorokColumn) => {
    setEditingColumnId(column.id)
    setEditingLabel(column.label)
  }

  const commitRename = async () => {
    const id = editingColumnId
    if (!id) return
    const trimmed = editingLabel.trim()
    setEditingColumnId(null)
    if (!trimmed) return
    const result = await renameColumn(id, trimmed)
    if (result.error) {
      setMessage('컬럼 이름 변경에 실패했습니다. 다시 시도해 주세요.')
      setMessageIsError(true)
    }
  }

  const handleDragStart = (columnId: string) => {
    setDraggedColumnId(columnId)
  }

  const handleDragOver = (e: DragEvent, columnId: string) => {
    e.preventDefault()
    if (columnId !== draggedColumnId) setDragOverColumnId(columnId)
  }

  const handleDrop = (targetId: string) => {
    setDragOverColumnId(null)
    if (!draggedColumnId || draggedColumnId === targetId) {
      setDraggedColumnId(null)
      return
    }
    const order = columns.map((c) => c.id)
    const fromIndex = order.indexOf(draggedColumnId)
    order.splice(fromIndex, 1)
    const toIndex = order.indexOf(targetId)
    order.splice(toIndex, 0, draggedColumnId)
    setDraggedColumnId(null)
    reorderColumns(order)
  }

  const handleConfirmDeleteColumn = async () => {
    if (!deleteTarget) return
    setDeletingColumn(true)
    const result = await deleteColumn(deleteTarget.id)
    setDeletingColumn(false)
    if (result.error) {
      setMessage('컬럼 삭제에 실패했습니다. 다시 시도해 주세요.')
      setMessageIsError(true)
      return
    }
    setDeleteTarget(null)
  }

  const loading = studentsLoading || columnsLoading || entriesLoading

  return (
    <div>
      <AddYorokColumnControl onAdd={addColumn} />

      {(columnsError || entriesError) && (
        <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {columnsError ?? entriesError}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">불러오는 중...</p>
      ) : students.length === 0 ? (
        <UnsetState message="학급요록을 작성하려면 먼저 학생을 등록해 주세요." />
      ) : columns.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-[14px] border border-gray-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-medium text-gray-700">아직 추가된 컬럼이 없습니다.</p>
          <p className="text-sm text-gray-500">위의 "컬럼 추가"에서 첫 컬럼을 만들어 보세요.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-2">
            {dirtyIds.size > 0 && <span className="text-sm text-gray-500">변경 {dirtyIds.size}명</span>}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || dirtyIds.size === 0}
              className="ml-auto h-9 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? '저장 중...' : '변경사항 저장'}
            </button>
          </div>

          {message && (
            <p
              className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                messageIsError ? 'border-red-100 bg-red-50 text-red-700' : 'border-brand-100 bg-brand-50 text-brand-700'
              }`}
              aria-live="polite"
            >
              {message}
            </p>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 w-[140px] max-w-[140px] border-b border-gray-200 bg-white px-3 py-2 text-left font-semibold text-gray-700">
                    학생
                  </th>
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      draggable
                      onDragStart={() => handleDragStart(column.id)}
                      onDragOver={(e) => handleDragOver(e, column.id)}
                      onDragLeave={() => setDragOverColumnId((prev) => (prev === column.id ? null : prev))}
                      onDrop={() => handleDrop(column.id)}
                      onDragEnd={() => {
                        setDraggedColumnId(null)
                        setDragOverColumnId(null)
                      }}
                      className={`min-w-[220px] border-b px-3 py-2 text-left font-semibold text-gray-700 transition-colors ${
                        dragOverColumnId === column.id ? 'border-b-brand-500 bg-brand-50' : 'border-gray-200 bg-white'
                      } ${draggedColumnId === column.id ? 'opacity-40' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical size={14} className="shrink-0 cursor-grab text-gray-300" />
                        {editingColumnId === column.id ? (
                          <input
                            type="text"
                            value={editingLabel}
                            onChange={(e) => setEditingLabel(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                e.currentTarget.blur()
                              }
                              if (e.key === 'Escape') {
                                setEditingColumnId(null)
                              }
                            }}
                            autoFocus
                            className={`h-7 min-w-0 flex-1 px-2 py-0 text-sm ${fieldClass}`}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => startRename(column)}
                            title="컬럼 이름 수정"
                            className="flex min-w-0 flex-1 items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-gray-100"
                          >
                            <span className="truncate">{column.label}</span>
                            <Pencil size={12} className="shrink-0 text-gray-300" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(column)}
                          aria-label={`${column.label} 컬럼 삭제`}
                          title="컬럼 삭제"
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orderedStudents.map((student) => (
                  <tr key={student.id}>
                    <td
                      className="sticky left-0 z-10 w-[140px] max-w-[140px] truncate border-b border-gray-100 bg-white px-3 py-2 font-medium text-gray-900"
                      title={`${student.number}번 ${student.name}`}
                    >
                      {student.number}번 {student.name}
                    </td>
                    {columns.map((column) => {
                      const rowValues = draft.get(student.id) ?? {}
                      const cellValue = rowValues[column.id]
                      return (
                        <td key={column.id} className="border-b border-gray-100 px-3 py-2 align-top">
                          {column.type === 'text' ? (
                            <textarea
                              value={(cellValue as string) ?? ''}
                              onChange={(e) => updateCell(student.id, column.id, e.target.value)}
                              rows={2}
                              className={`w-full min-w-[200px] resize-y ${textareaClass}`}
                            />
                          ) : (
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                checked={Boolean(cellValue)}
                                onChange={(e) => updateCell(student.id, column.id, e.target.checked)}
                                className="h-4 w-4 accent-brand-600"
                                aria-label={`${student.name} ${column.label}`}
                              />
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="컬럼 삭제"
          message={
            <>
              <span className="font-medium text-gray-900">{deleteTarget.label}</span> 컬럼을 삭제할까요?
              <br />
              모든 학생의 이 컬럼 내용이 함께 사라지며 되돌릴 수 없습니다.
            </>
          }
          pending={deletingColumn}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDeleteColumn}
        />
      )}
    </div>
  )
}
