import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { useStudents } from '../lib/hooks/useStudents'
import { useAllRecords } from '../lib/hooks/useAllRecords'
import { useRecordCounts } from '../lib/hooks/useRecordCounts'
import { StudentListItem } from '../components/StudentListItem'
import { PageContainer } from '../components/PageContainer'
import { YorokTable } from '../components/yorok/YorokTable'
import { buildRecordsCsv } from '../lib/csv'
import { yyyymmdd } from '../lib/utils/date-utils'
import { csvButtonClass, secondaryButtonClass } from '../lib/ui/classNames'

const GRID_CLASS = 'grid grid-cols-2 gap-2.5 @sm:grid-cols-3 @4xl:grid-cols-4 @6xl:grid-cols-5'

type Tab = 'roster' | 'yorok'

const tabButtonClass = (active: boolean) =>
  `rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
    active ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'
  }`

export function StudentListPage() {
  const { students, loading, error, refetch } = useStudents()
  const [activeTab, setActiveTab] = useState<Tab>('yorok')
  const { fetchAllRecords, loading: exportingRecords } = useAllRecords()
  const [exportError, setExportError] = useState<string | null>(null)
  const { counts: recordCounts, loading: countsLoading } = useRecordCounts()

  const handleExportRecords = async () => {
    setExportError(null)
    const result = await fetchAllRecords()
    if (result.error || !result.data) {
      setExportError(result.error ?? '생활기록을 불러오지 못했습니다.')
      return
    }
    const csv = buildRecordsCsv(result.data, students)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `생활기록_전체_${yyyymmdd(new Date())}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <PageContainer size="wide">
      <h1 className="mb-1 text-2xl font-semibold text-brand-700">학급기록</h1>
      <p className="mb-5 text-sm text-gray-500">우리 반 학생 {students.length}명</p>

      <div className="mb-6 flex gap-2 border-b border-gray-200 pb-2">
        <button type="button" onClick={() => setActiveTab('yorok')} className={tabButtonClass(activeTab === 'yorok')}>
          학급요록
        </button>
        <button type="button" onClick={() => setActiveTab('roster')} className={tabButtonClass(activeTab === 'roster')}>
          누가기록
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>학생 목록을 불러오지 못했습니다.</span>
          <button type="button" onClick={refetch} className={secondaryButtonClass}>
            다시 시도
          </button>
        </div>
      )}

      {activeTab === 'roster' ? (
        <div className="@container">
          {!loading && !error && students.length > 0 && (
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={handleExportRecords}
                disabled={exportingRecords}
                className={csvButtonClass}
              >
                <Download size={16} />
                {exportingRecords ? '내보내는 중...' : '생활기록 전체 내보내기'}
              </button>
            </div>
          )}

          {exportError && (
            <p className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {exportError}
            </p>
          )}

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
                <StudentListItem
                  key={student.id}
                  student={student}
                  recordCount={countsLoading ? undefined : recordCounts.get(student.id) ?? 0}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <YorokTable students={students} studentsLoading={loading} />
      )}
    </PageContainer>
  )
}
