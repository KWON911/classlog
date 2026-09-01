import { useEffect, useMemo, useState } from 'react'
import { PageContainer } from '../components/PageContainer'
import { GardenPageNav } from '../components/growth-garden/GardenPageNav'
import { MonthSelector } from '../components/growth-garden/report/MonthSelector'
import { ClassMonthlyReportView } from '../components/growth-garden/report/ClassMonthlyReportView'
import { StudentMonthlyReportView } from '../components/growth-garden/report/StudentMonthlyReportView'
import { SegmentedButton, SegmentedGroup } from '../components/growth-garden/Segmented'
import { GrowthFeedbackToast, type GrowthFeedback } from '../components/growth-garden/GrowthFeedbackToast'
import { MonthlyAwardList } from '../components/growth-garden/awards/MonthlyAwardList'
import { MonthlyAwardModal, type AwardFormValues } from '../components/growth-garden/awards/MonthlyAwardModal'
import { MonthlyAwardCelebration } from '../components/growth-garden/awards/MonthlyAwardCelebration'
import { useStudents } from '../lib/hooks/useStudents'
import { useMonthlyReport } from '../lib/hooks/useMonthlyReport'
import { useRewards } from '../lib/hooks/useRewards'
import { useMonthlyAwards } from '../lib/hooks/useMonthlyAwards'
import { currentYearMonth, formatMonthLabel, type YearMonth } from '../lib/growth-garden/monthlyReport'
import type { NewReward } from '../lib/growth-garden/services/types'
import type { MonthlyAward, Student } from '../lib/types'

type ReportTab = 'class' | 'student'

/**
 * /growth-garden/report — 월간 성장 리포트.
 *
 * 통계는 전부 기존 상벌점 기록에서 파생한다(중복 저장 없음). 보상만 별도 저장소이며,
 * 지급/삭제 어느 쪽도 학생의 성장 포인트를 건드리지 않는다.
 */
export function GrowthGardenReportPage() {
  const { students, loading: studentsLoading } = useStudents()
  const [yearMonth, setYearMonth] = useState<YearMonth>(() => currentYearMonth())
  const [tab, setTab] = useState<ReportTab>('class')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [feedback, setFeedback] = useState<GrowthFeedback | null>(null)

  const studentIds = useMemo(() => students.map((student) => student.id), [students])
  const { loading: reportLoading, error, classReport, growthRanking, studentReportFor } = useMonthlyReport(
    yearMonth,
    studentIds,
  )
  const rewards = useRewards(yearMonth)
  const awards = useMonthlyAwards(yearMonth)

  // 수상 모달/축하 화면 상태 — 어느 것도 학생 점수나 상벌점 기록을 건드리지 않는다.
  const [awardTarget, setAwardTarget] = useState<{ student: Student; monthlyGrowth: number } | null>(null)
  const [celebrating, setCelebrating] = useState<MonthlyAward | null>(null)

  // 명단이 로드되면 첫 학생을 기본 선택해 개인 탭이 빈 화면으로 시작하지 않게 한다.
  useEffect(() => {
    if (!selectedStudentId && students.length > 0) setSelectedStudentId(students[0].id)
  }, [students, selectedStudentId])

  const studentReport = selectedStudentId ? studentReportFor(selectedStudentId) : null
  const loading = studentsLoading || reportLoading

  async function handleCreateReward(input: NewReward) {
    const result = await rewards.createReward(input)
    if (!('error' in result)) {
      setFeedback({ id: Date.now(), tone: 'grow', message: '보상을 기록했어요!' })
    }
    return result
  }

  function handleDeleteReward(id: string) {
    void rewards.deleteReward(id)
  }

  const awardOfSelected = awards.awards.find((award) => award.student_id === selectedStudentId)

  /** 수상은 자동 확정하지 않는다 — 이 폼을 저장해야 기록이 생긴다. */
  async function handleAwardSubmit(values: AwardFormValues) {
    if (!awardTarget) return
    const existing = awards.awards.find((award) => award.student_id === awardTarget.student.id)
    const result = existing
      ? await awards.updateAward(existing.id, values)
      : await awards.createAward({
          student_id: awardTarget.student.id,
          year: yearMonth.year,
          month: yearMonth.month,
          monthly_growth: awardTarget.monthlyGrowth,
          ...values,
        })

    if (!('error' in result)) {
      setAwardTarget(null)
      setFeedback({
        id: Date.now(),
        tone: 'grow',
        message: existing ? '수상 정보를 수정했어요.' : awardTarget.student.name + ' 학생을 선정했어요!',
      })
    }
  }

  const celebratingStudent = celebrating
    ? students.find((student) => student.id === celebrating.student_id)
    : undefined
  const celebratingReport = celebrating ? studentReportFor(celebrating.student_id) : null

  return (
    <PageContainer size="wide">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-700">
            {formatMonthLabel(yearMonth)} 우리 반 성장 리포트 🌱
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            한 달 동안의 기록을 함께 보고, 학급과 개인 보상을 남겨 보세요.
          </p>
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex items-center">
          <GardenPageNav />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthSelector value={yearMonth} onChange={setYearMonth} />
          <SegmentedGroup label="리포트 종류">
            <SegmentedButton active={tab === 'class'} onClick={() => setTab('class')}>
              학급
            </SegmentedButton>
            <SegmentedButton active={tab === 'student'} onClick={() => setTab('student')}>
              개인
            </SegmentedButton>
          </SegmentedGroup>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}
      {rewards.error && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {rewards.error}
        </p>
      )}

      {loading && (
        <div className="flex flex-col gap-3">
          <div className="h-28 animate-pulse rounded-[12px] bg-gray-100" />
          <div className="h-40 animate-pulse rounded-[12px] bg-gray-100" />
          <div className="h-40 animate-pulse rounded-[12px] bg-gray-100" />
        </div>
      )}

      {!loading && students.length === 0 && (
        <div className="rounded-[14px] border border-dashed border-gray-300 bg-white px-6 py-16 text-center text-sm text-gray-600">
          아직 등록된 학생이 없어 리포트를 만들 수 없습니다.
        </div>
      )}

      {!loading && students.length > 0 && tab === 'class' && (
        <ClassMonthlyReportView
          report={classReport}
          awardList={
            <MonthlyAwardList
              yearMonth={yearMonth}
              awards={awards.awards}
              students={students}
              loading={awards.loading}
              onCelebrate={setCelebrating}
              onEdit={(award) => {
                const student = students.find((candidate) => candidate.id === award.student_id)
                if (student) setAwardTarget({ student, monthlyGrowth: award.monthly_growth })
              }}
              onDelete={(id) => void awards.deleteAward(id)}
            />
          }
          rewards={rewards.classRewards}
          rewardsLoading={rewards.loading}
          rewardSaving={rewards.saving}
          onCreateReward={handleCreateReward}
          onDeleteReward={handleDeleteReward}
        />
      )}

      {!loading && students.length > 0 && tab === 'student' && (
        <StudentMonthlyReportView
          students={students}
          selectedId={selectedStudentId}
          onSelect={setSelectedStudentId}
          report={studentReport}
          growthRows={growthRanking}
          awardOfSelected={awardOfSelected}
          onAward={(student, monthlyGrowth) => setAwardTarget({ student, monthlyGrowth })}
          rewards={selectedStudentId ? rewards.rewardsForStudent(selectedStudentId) : []}
          rewardsLoading={rewards.loading}
          rewardSaving={rewards.saving}
          onCreateReward={handleCreateReward}
          onDeleteReward={handleDeleteReward}
        />
      )}

      {awardTarget && (
        <MonthlyAwardModal
          student={awardTarget.student}
          yearMonth={yearMonth}
          monthlyGrowth={awardTarget.monthlyGrowth}
          award={awards.awards.find((award) => award.student_id === awardTarget.student.id)}
          saving={awards.saving}
          onClose={() => setAwardTarget(null)}
          onSubmit={handleAwardSubmit}
        />
      )}

      {celebrating && celebratingStudent && celebratingReport && (
        <MonthlyAwardCelebration
          award={celebrating}
          student={celebratingStudent}
          stage={celebratingReport.cycleEnd.currentStage}
          flowerType={celebratingReport.cycleEnd.currentFlowerType}
          topReasons={celebratingReport.meritReasons}
          environment={classReport.garden.end}
          onClose={() => setCelebrating(null)}
        />
      )}

      {awards.error && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {awards.error}
        </p>
      )}

      <GrowthFeedbackToast feedback={feedback} onDismiss={() => setFeedback(null)} />
    </PageContainer>
  )
}
