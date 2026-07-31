import { useState, type FormEvent } from 'react'

export type StudentFormValues = {
  number: number
  name: string
  gender: string
  birthdate: string
  student_phone: string
  address: string
  father_name: string
  father_phone: string
  mother_name: string
  mother_phone: string
  emergency_contact: string
  note: string
}

type StudentFormProps = {
  initialValues?: Partial<StudentFormValues>
  onSubmit: (values: StudentFormValues) => Promise<void> | void
  onCancel: () => void
  submitLabel: string
}

export function StudentForm({ initialValues, onSubmit, onCancel, submitLabel }: StudentFormProps) {
  const [number, setNumber] = useState(String(initialValues?.number ?? ''))
  const [name, setName] = useState(initialValues?.name ?? '')
  const [gender, setGender] = useState(initialValues?.gender ?? '')
  const [birthdate, setBirthdate] = useState(initialValues?.birthdate ?? '')
  const [studentPhone, setStudentPhone] = useState(initialValues?.student_phone ?? '')
  const [address, setAddress] = useState(initialValues?.address ?? '')
  const [fatherName, setFatherName] = useState(initialValues?.father_name ?? '')
  const [fatherPhone, setFatherPhone] = useState(initialValues?.father_phone ?? '')
  const [motherName, setMotherName] = useState(initialValues?.mother_name ?? '')
  const [motherPhone, setMotherPhone] = useState(initialValues?.mother_phone ?? '')
  const [emergencyContact, setEmergencyContact] = useState(initialValues?.emergency_contact ?? '')
  const [note, setNote] = useState(initialValues?.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !number.trim()) {
      setError('이름과 출석번호는 필수입니다.')
      return
    }
    setError(null)
    setSubmitting(true)
    await onSubmit({
      number: Number(number),
      name: name.trim(),
      gender,
      birthdate,
      student_phone: studentPhone,
      address,
      father_name: fatherName,
      father_phone: fatherPhone,
      mother_name: motherName,
      mother_phone: motherPhone,
      emergency_contact: emergencyContact,
      note,
    })
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        출석번호
        <input
          type="number"
          required
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        이름
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        성별
        <input
          type="text"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        생년월일
        <input
          type="text"
          placeholder="예: 240304"
          value={birthdate}
          onChange={(e) => setBirthdate(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        학생 전화
        <input
          type="text"
          value={studentPhone}
          onChange={(e) => setStudentPhone(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        주소
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        부 성명
        <input
          type="text"
          value={fatherName}
          onChange={(e) => setFatherName(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        부 전화
        <input
          type="text"
          value={fatherPhone}
          onChange={(e) => setFatherPhone(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        모 성명
        <input
          type="text"
          value={motherName}
          onChange={(e) => setMotherName(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        모 전화
        <input
          type="text"
          value={motherPhone}
          onChange={(e) => setMotherPhone(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        비상연락처
        <input
          type="text"
          value={emergencyContact}
          onChange={(e) => setEmergencyContact(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        비고
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
        >
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded border border-gray-300 px-3 py-2">
          취소
        </button>
      </div>
    </form>
  )
}
