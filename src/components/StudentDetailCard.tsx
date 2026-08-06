import { StudentForm, type StudentFormValues } from './StudentForm'
import { sectionCardClass } from '../lib/ui/classNames'
import type { Student } from '../lib/types'

type StudentDetailCardProps = {
  student: Student
  panelId: string
  editMode: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSubmit: (values: StudentFormValues) => Promise<void> | void
  onDirtyChange: (dirty: boolean) => void
}

function displayValue(value: string | null) {
  return value && value.trim() ? value : '미입력'
}

export function StudentDetailCard({
  student,
  panelId,
  editMode,
  onStartEdit,
  onCancelEdit,
  onSubmit,
  onDirtyChange,
}: StudentDetailCardProps) {
  return (
    <div id={panelId} className={`mb-6 ${sectionCardClass}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">학생 상세정보</h2>
        {!editMode && (
          <button
            type="button"
            onClick={onStartEdit}
            aria-label={`${student.name} 학생 정보 수정`}
            className="rounded-md px-2.5 py-1 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50"
          >
            수정
          </button>
        )}
      </div>

      {editMode ? (
        <StudentForm
          key={student.id}
          submitLabel="저장"
          initialValues={{
            number: student.number,
            name: student.name,
            gender: student.gender ?? '',
            birthdate: student.birthdate ?? '',
            student_phone: student.student_phone ?? '',
            address: student.address ?? '',
            father_name: student.father_name ?? '',
            father_phone: student.father_phone ?? '',
            mother_name: student.mother_name ?? '',
            mother_phone: student.mother_phone ?? '',
            emergency_contact: student.emergency_contact ?? '',
            note: student.note ?? '',
          }}
          onSubmit={onSubmit}
          onCancel={onCancelEdit}
          onDirtyChange={onDirtyChange}
        />
      ) : (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <dt className="text-gray-500">출석번호</dt>
          <dd className="font-medium text-gray-900">{student.number}</dd>
          <dt className="text-gray-500">이름</dt>
          <dd className="font-medium text-gray-900">{student.name}</dd>
          <dt className="text-gray-500">성별</dt>
          <dd className="font-medium text-gray-900">{displayValue(student.gender)}</dd>
          <dt className="text-gray-500">생년월일</dt>
          <dd className="font-medium text-gray-900">{displayValue(student.birthdate)}</dd>
          <dt className="text-gray-500">본인 연락처</dt>
          <dd className="font-medium text-gray-900">{displayValue(student.student_phone)}</dd>
          <dt className="text-gray-500">주소</dt>
          <dd className="font-medium text-gray-900">{displayValue(student.address)}</dd>
          <dt className="text-gray-500">부 성명</dt>
          <dd className="font-medium text-gray-900">{displayValue(student.father_name)}</dd>
          <dt className="text-gray-500">부 연락처</dt>
          <dd className="font-medium text-gray-900">{displayValue(student.father_phone)}</dd>
          <dt className="text-gray-500">모 성명</dt>
          <dd className="font-medium text-gray-900">{displayValue(student.mother_name)}</dd>
          <dt className="text-gray-500">모 연락처</dt>
          <dd className="font-medium text-gray-900">{displayValue(student.mother_phone)}</dd>
          <dt className="text-gray-500">비상연락처</dt>
          <dd className="font-medium text-gray-900">{displayValue(student.emergency_contact)}</dd>
          <dt className="text-gray-500">비고</dt>
          <dd className="font-medium text-gray-900">{displayValue(student.note)}</dd>
        </dl>
      )}
    </div>
  )
}
