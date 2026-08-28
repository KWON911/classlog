import { useMemo, useState } from 'react'
import { Download, Plus, Upload, UsersRound } from 'lucide-react'
import { Modal } from '../Modal'
import { ConfirmDialog } from '../ConfirmDialog'
import { ImportStudentsPanel } from '../ImportStudentsPanel'
import { StudentForm, type StudentFormValues } from '../StudentForm'
import { StudentRowMenu } from './StudentRowMenu'
import { StudentDetailModal } from './StudentDetailModal'
import { mapGender } from '../../lib/seating'
import {
  addButtonClass,
  cardTitleClass,
  csvButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionCardClass,
} from '../../lib/ui/classNames'
import { buildStudentsCsv, type ParsedStudentRow } from '../../lib/csv'
import { yyyymmdd } from '../../lib/utils/date-utils'
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
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null)
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
  const genderCounts = useMemo(() => {
    const counts = { male: 0, female: 0, unspecified: 0 }
    for (const student of students) {
      counts[mapGender(student.gender)] += 1
    }
    return counts
  }, [students])

  const handleAddSubmit = async (values: StudentFormValues) => {
    const result = await addStudent({
      number: values.number,
      name: values.name,
      gender: values.gender || null,
      birthdate: values.birthdate || null,
      student_phone: values.student_phone || null,
      address: values.address || null,
      father_name: values.father_name || null,
      father_phone: values.father_phone || null,
      mother_name: values.mother_name || null,
      mother_phone: values.mother_phone || null,
      emergency_contact: values.emergency_contact || null,
      note: values.note || null,
    })
    if (!result.error) setShowAdd(false)
  }

  const handleExportCsv = () => {
    const csv = buildStudentsCsv(students)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `학생명단_${yyyymmdd(new Date())}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleEditSubmit = async (values: StudentFormValues) => {
    if (!editingStudent) return
    const result = await updateStudent(editingStudent.id, {
      number: values.number,
      name: values.name,
      gender: values.gender || null,
      birthdate: values.birthdate || null,
      student_phone: values.student_phone || null,
      address: values.address || null,
      father_name: values.father_name || null,
      father_phone: values.father_phone || null,
      mother_name: values.mother_name || null,
      mother_phone: values.mother_phone || null,
      emergency_contact: values.emergency_contact || null,
      note: values.note || null,
    })
    if (!result.error) setEditingStudent(null)
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
    <div className={`${sectionCardClass} @container`}>
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={cardTitleClass}>학생 정보</h2>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
              {students.length}명
            </span>
            {students.length > 0 && (
              <span className="text-xs text-gray-400">
                남 {genderCounts.male}명 · 여 {genderCounts.female}명
                {genderCounts.unspecified > 0 && ` · 미입력 ${genderCounts.unspecified}명`}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 @sm:flex-nowrap @sm:justify-end">
          <div className="order-2 hidden shrink-0 items-center gap-2 sm:flex @sm:order-1">
            <button type="button" onClick={() => setShowImport(true)} className={csvButtonClass}>
              <Upload size={16} />
              CSV 가져오기
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={students.length === 0}
              className={csvButtonClass}
            >
              <Download size={16} />
              CSV 내보내기
            </button>
          </div>
          <button type="button" onClick={() => setShowAdd(true)} className={`order-1 @sm:order-2 ${addButtonClass}`}>
            <Plus size={16} />
            개별 추가
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
              <p className="mt-1 text-sm text-gray-500">
                <span className="sm:hidden">학생을 추가해 보세요.</span>
                <span className="hidden sm:inline">학생을 직접 추가하거나 CSV 파일로 가져오세요.</span>
              </p>
            </div>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => setShowImport(true)}
                className={`hidden sm:inline-block ${secondaryButtonClass}`}
              >
                CSV 가져오기
              </button>
              <button type="button" onClick={() => setShowAdd(true)} className={primaryButtonClass}>
                개별 추가
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
                        onViewDetails={() => setViewingStudent(student)}
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
        <Modal title="학생 추가" description="새 학생의 정보를 입력합니다." onClose={() => setShowAdd(false)}>
          <StudentForm
            submitLabel="추가"
            initialValues={{
              number: suggestedNumber,
              name: '',
              gender: '',
              birthdate: '',
              student_phone: '',
              address: '',
              father_name: '',
              father_phone: '',
              mother_name: '',
              mother_phone: '',
              emergency_contact: '',
              note: '',
            }}
            onSubmit={handleAddSubmit}
            onCancel={() => setShowAdd(false)}
          />
        </Modal>
      )}

      {viewingStudent && (
        <StudentDetailModal student={viewingStudent} onClose={() => setViewingStudent(null)} />
      )}

      {editingStudent && (
        <Modal
          title="학생 정보 수정"
          description={`${editingStudent.number}. ${editingStudent.name} 학생의 정보를 수정합니다.`}
          onClose={() => setEditingStudent(null)}
        >
          <StudentForm
            key={editingStudent.id}
            submitLabel="변경 저장"
            initialValues={{
              number: editingStudent.number,
              name: editingStudent.name,
              gender: editingStudent.gender ?? '',
              birthdate: editingStudent.birthdate ?? '',
              student_phone: editingStudent.student_phone ?? '',
              address: editingStudent.address ?? '',
              father_name: editingStudent.father_name ?? '',
              father_phone: editingStudent.father_phone ?? '',
              mother_name: editingStudent.mother_name ?? '',
              mother_phone: editingStudent.mother_phone ?? '',
              emergency_contact: editingStudent.emergency_contact ?? '',
              note: editingStudent.note ?? '',
            }}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditingStudent(null)}
          />
        </Modal>
      )}

      {showImport && (
        <Modal
          title="CSV로 학생 가져오기"
          description="기존 학생 명단 CSV 파일을 불러옵니다."
          maxWidthClassName="max-w-xl"
          onClose={() => setShowImport(false)}
        >
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
