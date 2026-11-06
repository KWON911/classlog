import { useMemo, useState, type FormEvent } from 'react'
import { fieldClass, labelClass, primaryButtonClass, secondaryButtonClass } from '../lib/ui/classNames'

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
  const legacyGender = initialValues?.gender && !['남', '여'].includes(initialValues.gender) ? initialValues.gender : null
  const calendarDate = /^\d{6}$/.test(birthdate)
    ? `20${birthdate.slice(0, 2)}-${birthdate.slice(2, 4)}-${birthdate.slice(4, 6)}`
    : /^\d{4}-\d{2}-\d{2}$/.test(birthdate) ? birthdate : ''

  const isEditingExisting = initialValues !== undefined

  const isDirty = useMemo(
    () =>
      number !== String(initialValues?.number ?? '') ||
      name !== (initialValues?.name ?? '') ||
      gender !== (initialValues?.gender ?? '') ||
      birthdate !== (initialValues?.birthdate ?? '') ||
      studentPhone !== (initialValues?.student_phone ?? '') ||
      address !== (initialValues?.address ?? '') ||
      fatherName !== (initialValues?.father_name ?? '') ||
      fatherPhone !== (initialValues?.father_phone ?? '') ||
      motherName !== (initialValues?.mother_name ?? '') ||
      motherPhone !== (initialValues?.mother_phone ?? '') ||
      emergencyContact !== (initialValues?.emergency_contact ?? '') ||
      note !== (initialValues?.note ?? ''),
    [
      number,
      name,
      gender,
      birthdate,
      studentPhone,
      address,
      fatherName,
      fatherPhone,
      motherName,
      motherPhone,
      emergencyContact,
      note,
      initialValues,
    ],
  )

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          출석번호
          <input
            type="number"
            required
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          이름
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          성별
          <select value={gender} onChange={(e) => setGender(e.target.value)} className={fieldClass}>
            <option value="">선택</option>
            <option value="남">남</option>
            <option value="여">여</option>
            {legacyGender && <option value={legacyGender}>{legacyGender}</option>}
          </select>
        </label>
        <div className={labelClass}>
          <label htmlFor="student-birthdate-text">생년월일</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="student-birthdate-text"
              type="text"
              inputMode="numeric"
              placeholder="직접 입력: 240304"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              className={`${fieldClass} min-w-0 flex-1`}
            />
            <input
              type="date"
              aria-label="생년월일 달력에서 선택"
              title="달력에서 선택"
              value={calendarDate}
              onChange={(e) => {
                const selected = e.target.value
                setBirthdate(selected ? selected.slice(2).replaceAll('-', '') : '')
              }}
              className={`${fieldClass} w-full min-w-0 sm:w-36`}
            />
          </div>
        </div>
        <label className={labelClass}>
          학생 전화
          <input
            type="text"
            value={studentPhone}
            onChange={(e) => setStudentPhone(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          비상연락처
          <input
            type="text"
            value={emergencyContact}
            onChange={(e) => setEmergencyContact(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          주소
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          부 성명
          <input
            type="text"
            value={fatherName}
            onChange={(e) => setFatherName(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          부 전화
          <input
            type="text"
            value={fatherPhone}
            onChange={(e) => setFatherPhone(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          모 성명
          <input
            type="text"
            value={motherName}
            onChange={(e) => setMotherName(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          모 전화
          <input
            type="text"
            value={motherPhone}
            onChange={(e) => setMotherPhone(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          비고
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || (isEditingExisting && !isDirty)}
          className={primaryButtonClass}
        >
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          취소
        </button>
      </div>
    </form>
  )
}
