import { useMemo, useState } from 'react'
import { Plus, Upload, UsersRound } from 'lucide-react'
import { Modal } from '../Modal'
import { ConfirmDialog } from '../ConfirmDialog'
import { ImportStudentsPanel } from '../ImportStudentsPanel'
import { StudentQuickFormModal, type StudentQuickFormValues } from './StudentQuickFormModal'
import { StudentRowMenu } from './StudentRowMenu'
import { mapGender } from '../../lib/seating'
import {
  cardDescriptionClass,
  cardTitleClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionCardClass,
} from '../../lib/ui/classNames'
import type { ParsedStudentRow } from '../../lib/csv'
import type { Student } from '../../lib/types'

const GENDER_LABEL: Record<'male' | 'female' | 'unspecified', string> = {
  male: '남',
  female: '여',
  unspecified: '미입력',
}

type MutationResult = { error?: string }

type StudentListCardProps = {
  students: Student[]
  loading: boolean
  error: string | null
  onRetry: () => void
  addStudent: (input: Omit<Student, 'id' | 'teacher_id' | 'created_at'>) => Promise<MutationResult>
  updateStudent: (
    id: string,
    input: Partial<Omit<Student, 'id' | 'teacher_id' | 'created_at'>>,
  ) => Promise<MutationResult>
  deleteStudent: (id: string) => Promise<MutationResult>
  addStudents: (rows: ParsedStudentRow[]) => Promise<MutationResult>
  deleteAllStudents: () => Promise<MutationResult>
}

const ROW_GRID_CLASS = 'sm:grid-cols-[64px_minmax(160px,1fr)_120px_72px]'

export function StudentListCard({
  students,
  loading,
  error,
  onRetry,
  addStudent,
  updateStudent,
  deleteStudent,
  addStudents,
  deleteAllStudents,
}: StudentListCardProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null)
  const [deletingOne, setDeletingOne] = useState(false)
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)

  const existingNumbers = useMemo(() => new Set(students.map((s) => s.number)), [students])
  const suggestedNumber = useMemo(
    () => (students.length === 0 ? 1 : Math.max(...students.map((s) => s.number)) + 1),
    [students],
  )

  const handleAddSubmit = async (values: StudentQuickFormValues): Promise<MutationResult> => {
    const result = await addStudent({
      number: values.number,
      name: values.name,
      gender: values.gender || null,
      birthdate: null,
      student_phone: null,
      address: null,
      father_name: null,
      father_phone: null,
      mother_name: null,
      mother_phone: null,
      emergency_contact: null,
      note: null,
    })
    if (!result.error) setShowAdd(false)
    return result
  }

  const handleEditSubmit = async (values: StudentQuickFormValues): Promise<MutationResult> => {
    if (!editingStudent) return { error: '학생을 찾을 수 없습니다.' }
    const result = await updateStudent(editingStudent.id, {
      name: values.name,
      gender: values.gender || null,
    })
    if (!result.error) setEditingStudent(null)
    return result
  }

  const handleConfirmDeleteOne = async () => {
    if (!deleteTarget) return
    setDeletingOne(true)
    await deleteStudent(deleteTarget.id)
    setDeletingOne(false)
    setDeleteTarget(null)
  }

  const handleConfirmDeleteAll = async () => {
    setDeletingAll(true)
    await deleteAllStudents()
    setDeletingAll(false)
    setShowDeleteAllConfirm(false)
  }

  return (
    <div className={sectionCardClass}>
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className={cardTitleClass}>학생 명단</h2>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
              {students.length}명
            </span>
          </div>
          <p className={`mt-1 ${cardDescriptionClass}`}>학급에서 공통으로 사용할 학생을 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowImport(true)} className={secondaryButtonClass}>
            <span className="inline-flex items-center gap-1.5">
              <Upload size={16} />
              CSV 가져오기
            </span>
          </button>
          <button type="button" onClick={() => setShowAdd(true)} className={primaryButtonClass}>
            <span className="inline-flex items-center gap-1.5">
              <Plus size={16} />
              학생 추가
            </span>
          </button>
        </div>
      </div>

      <div className="pt-2">
        {loading && (
          <div className="py-2">
            <p className="mb-3 text-sm text-gray-500">학생 명단을 불러오는 중입니다...</p>
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-[52px] animate-pulse rounded-lg bg-gray-50" />
              ))}
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-red-600">학생 명단을 불러오지 못했습니다.</p>
            <button type="button" onClick={onRetry} className={secondaryButtonClass}>
              다시 시도
            </button>
          </div>
        )}

        {!loading && !error && students.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <UsersRound size={28} className="text-gray-300" />
            <div>
              <p className="text-sm font-medium text-gray-700">등록된 학생이 없습니다.</p>
              <p className="mt-1 text-sm text-gray-500">학생을 직접 추가하거나 CSV 파일로 가져오세요.</p>
            </div>
            <div className="mt-1 flex gap-2">
              <button type="button" onClick={() => setShowImport(true)} className={secondaryButtonClass}>
                CSV 가져오기
              </button>
              <button type="button" onClick={() => setShowAdd(true)} className={primaryButtonClass}>
                학생 추가
              </button>
            </div>
          </div>
        )}

        {!loading && !error && students.length > 0 && (
          <div>
            <div
              className={`grid grid-cols-[36px_1fr_52px_40px] gap-1.5 px-1 pb-2 text-xs font-medium text-gray-400 sm:gap-2 sm:px-2 ${ROW_GRID_CLASS}`}
            >
              <span className="text-center">순번</span>
              <span>이름</span>
              <span className="text-center sm:text-left">성별</span>
              <span className="text-center">관리</span>
            </div>
            <ul>
              {students.map((student) => {
                const genderLabel = GENDER_LABEL[mapGender(student.gender)]
                return (
                  <li
                    key={student.id}
                    className={`grid h-[52px] grid-cols-[36px_1fr_52px_40px] items-center gap-1.5 border-b border-gray-100 px-1 transition-colors last:border-b-0 hover:bg-gray-50/80 sm:h-[54px] sm:gap-2 sm:px-2 ${ROW_GRID_CLASS}`}
                  >
                    <span className="text-center text-xs text-gray-500 sm:text-sm">{student.number}</span>
                    <span className="truncate text-sm font-medium text-gray-900">{student.name}</span>
                    <span className="text-center text-xs text-gray-600 sm:text-left sm:text-sm">{genderLabel}</span>
                    <span className="flex justify-center">
                      <StudentRowMenu
                        studentName={student.name}
                        onEdit={() => setEditingStudent(student)}
                        onDelete={() => setDeleteTarget(student)}
                      />
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={() => setShowDeleteAllConfirm(true)}
          disabled={students.length === 0}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          명단 전체 삭제
        </button>
      </div>

      {showAdd && (
        <StudentQuickFormModal
          mode="add"
          suggestedNumber={suggestedNumber}
          onCancel={() => setShowAdd(false)}
          onSubmit={handleAddSubmit}
        />
      )}

      {editingStudent && (
        <StudentQuickFormModal
          mode="edit"
          student={editingStudent}
          onCancel={() => setEditingStudent(null)}
          onSubmit={handleEditSubmit}
        />
      )}

      {showImport && (
        <Modal title="CSV로 학생 가져오기" description="기존 학생 명단 CSV 파일을 불러옵니다." onClose={() => setShowImport(false)}>
          <ImportStudentsPanel
            existingNumbers={existingNumbers}
            onImport={addStudents}
            onCancel={() => setShowImport(false)}
          />
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="학생 삭제"
          message={
            <>
              <span className="font-medium text-gray-900">
                {deleteTarget.number}. {deleteTarget.name}
              </span>{' '}
              학생을 삭제할까요?
              <br />
              연결된 모든 생활기록도 함께 삭제되며 되돌릴 수 없습니다.
            </>
          }
          pending={deletingOne}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDeleteOne}
        />
      )}

      {showDeleteAllConfirm && (
        <ConfirmDialog
          title="학생 명단 전체 삭제"
          message={
            <>
              등록된 학생 <span className="font-medium text-gray-900">{students.length}명</span>을 모두 삭제할까요?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </>
          }
          confirmLabel="전체 삭제"
          pendingLabel="삭제 중..."
          pending={deletingAll}
          onCancel={() => setShowDeleteAllConfirm(false)}
          onConfirm={handleConfirmDeleteAll}
        />
      )}
    </div>
  )
}
