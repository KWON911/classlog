import { Link } from 'react-router-dom'
import { useStudents } from '../lib/hooks/useStudents'
import { StudentListItem } from '../components/StudentListItem'
import { PageContainer } from '../components/PageContainer'
import { secondaryButtonClass } from '../lib/ui/classNames'

const GRID_CLASS = 'grid grid-cols-2 gap-2.5 @sm:grid-cols-3 @4xl:grid-cols-4 @6xl:grid-cols-5'

export function StudentListPage() {
  const { students, loading, error, refetch } = useStudents()

  return (
    <PageContainer size="wide">
      <h1 className="mb-1 text-2xl font-semibold text-brand-700">학급기록</h1>
      <p className="mb-5 text-sm text-gray-500">우리 반 학생 {students.length}명</p>

      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>학생 목록을 불러오지 못했습니다.</span>
          <button type="button" onClick={refetch} className={secondaryButtonClass}>
            다시 시도
          </button>
        </div>
      )}

      <div className="@container">
        {loading && (
          <div className={GRID_CLASS}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-[60px] animate-pulse rounded-[10px] bg-gray-100" />
            ))}
          </div>
        )}

        {!loading && !error && students.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-[14px] border border-gray-200 bg-white px-6 py-14 text-center">
            <div>
              <p className="text-sm font-medium text-gray-700">등록된 학생이 없습니다.</p>
              <p className="mt-1 text-sm text-gray-500">정보관리에서 학생을 추가해 주세요.</p>
            </div>
            <Link to="/students/manage" className={secondaryButtonClass}>
              정보관리로 이동
            </Link>
          </div>
        )}

        {!loading && !error && students.length > 0 && (
          <div className={GRID_CLASS}>
            {students.map((student) => (
              <StudentListItem key={student.id} student={student} />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
