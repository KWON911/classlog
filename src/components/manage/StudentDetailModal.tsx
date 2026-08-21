import { Modal } from '../Modal'
import type { Student } from '../../lib/types'

type StudentDetailModalProps = {
  student: Student
  onClose: () => void
}

function displayValue(value: string | null) {
  return value && value.trim() ? value : '미입력'
}

export function StudentDetailModal({ student, onClose }: StudentDetailModalProps) {
  return (
    <Modal title="학생 상세정보" description={`${student.number}. ${student.name}`} onClose={onClose}>
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
    </Modal>
  )
}
