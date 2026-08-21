import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useYorokColumns } from '../../lib/hooks/useYorokColumns'
import { useYorokEntries } from '../../lib/hooks/useYorokEntries'
import type { Student, YorokColumn, YorokEntry } from '../../lib/types'
import { textareaClass } from '../../lib/ui/classNames'
import { UnsetState } from '../home/HomeCardStates'
import { ConfirmDialog } from '../ConfirmDialog'
import { AddYorokColumnControl } from './AddYorokColumnControl'

type YorokTableProps = {
  students: Student[]
  studentsLoading: boolean
}

export function YorokTable({ students, studentsLoading }: YorokTableProps) {
  const { columns, loading: columnsLoading, error: columnsError, addColumn, deleteColumn } = useYorokColumns()
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
                  <th className="sticky left-0 z-10 min-w-[140px] border-b border-gray-200 bg-white px-3 py-2 text-left font-semibold text-gray-700">
                    학생
                  </th>
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      className="min-w-[220px] border-b border-gray-200 bg-white px-3 py-2 text-left font-semibold text-gray-700"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{column.label}</span>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(column)}
                          aria-label={`${column.label} 컬럼 삭제`}
                          title="컬럼 삭제"
                          className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
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
                    <td className="sticky left-0 z-10 border-b border-gray-100 bg-white px-3 py-2 font-medium text-gray-900">
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
