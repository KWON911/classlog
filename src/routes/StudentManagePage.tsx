import { useStudents } from '../lib/hooks/useStudents'
import { SchoolSettingsSection } from '../components/manage/SchoolSettingsSection'
import { StudentListCard } from '../components/manage/StudentListCard'

export function StudentManagePage() {
  const {
    students,
    loading,
    error,
    addStudent,
    addStudents,
    updateStudent,
    deleteStudent,
    deleteAllStudents,
    refetch,
  } = useStudents()

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold text-gray-900">정보관리</h1>
      <p className="mt-1.5 mb-6 text-sm text-gray-500">
        여기에 저장한 정보는 시간표·출결·자리배치에서 공통으로 사용됩니다.
      </p>

      <div className="flex flex-col gap-5">
        <SchoolSettingsSection />

        <StudentListCard
          students={students}
          loading={loading}
          error={error}
          onRetry={refetch}
          addStudent={addStudent}
          updateStudent={updateStudent}
          deleteStudent={deleteStudent}
          addStudents={addStudents}
          deleteAllStudents={deleteAllStudents}
        />
      </div>
    </div>
  )
}
