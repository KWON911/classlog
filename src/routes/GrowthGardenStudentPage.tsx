import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageContainer } from '../components/PageContainer'
import { PlantIllustration } from '../components/growth-garden/PlantIllustration'
import { StageProgressBar } from '../components/growth-garden/StageProgressBar'
import { PointActionButtons } from '../components/growth-garden/PointActionButtons'
import { BehaviorPointModal } from '../components/growth-garden/BehaviorPointModal'
import { GrowthFeedbackToast } from '../components/growth-garden/GrowthFeedbackToast'
import { GrowthLogTimeline } from '../components/growth-garden/GrowthLogTimeline'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useStudents } from '../lib/hooks/useStudents'
import { useGrowthGarden } from '../lib/hooks/useGrowthGarden'
import { usePlantPulse } from '../lib/hooks/usePlantPulse'
import { useGrowthRecorder } from '../lib/hooks/useGrowthRecorder'
import { stageProgress } from '../lib/growth-garden/growth'
import { HISTORY_PREVIEW_COUNT } from '../lib/growth-garden/constants'
import { useGrowthSettings } from '../lib/growth-garden/growthSettingsContext'
import { sectionCardClass } from '../lib/ui/classNames'

/** /growth-garden/:studentId — 한 학생의 화분과 기록 내역. */
export function GrowthGardenStudentPage() {
  const { studentId = '' } = useParams()
  const { students, loading: studentsLoading } = useStudents()
  const {
    summaryFor,
    historyFor,
    loading: gardenLoading,
    error,
    addPoint,
    isSaving,
    deleteEntry,
    clearStudent,
  } = useGrowthGarden()
  const { personalStages } = useGrowthSettings()
  const { pulseFor, trigger } = usePlantPulse()
  const recorder = useGrowthRecorder({ addPoint, trigger })
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [showAllHistory, setShowAllHistory] = useState(false)

  const student = students.find((candidate) => candidate.id === studentId)
  const summary = summaryFor(studentId)
  const progress = stageProgress(summary.score, personalStages)
  const history = historyFor(studentId)
  const loading = studentsLoading || gardenLoading

  // 기본은 최근 10개만 — 30건이 넘어가도 화면이 길어지지 않게 한다.
  const visibleHistory = useMemo(
    () => (showAllHistory ? history : history.slice(0, HISTORY_PREVIEW_COUNT)),
    [history, showAllHistory],
  )

  /** 기록 삭제도 점수를 바꾸므로, 바뀐 방향에 맞는 애니메이션을 재생한다. */
  async function handleDelete(entryId: string) {
    const removed = history.find((entry) => entry.id === entryId)
    const result = await deleteEntry(entryId)
    if (!result.error && removed) trigger(studentId, removed.type === 'merit' ? 'demerit' : 'merit')
  }

  if (!loading && !student) {
    return (
      <PageContainer size="standard">
        <p className="py-16 text-center text-sm text-gray-500">학생을 찾을 수 없습니다.</p>
        <div className="text-center">
          <Link to="/growth-garden" className="text-sm font-semibold text-brand-600 hover:underline">
            정원으로 돌아가기
          </Link>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer size="standard" maxWidth="1000px">
      <Link
        to="/growth-garden"
        className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-brand-600"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        학급 성장정원
      </Link>

      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* 현재 상태 */}
        <section className={`${sectionCardClass} flex flex-col items-center`}>
          <div className="flex w-full items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{student ? `${student.number}번` : ''}</p>
              <h1 className="text-2xl font-semibold text-gray-900">{student?.name ?? '...'}</h1>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold tabular-nums text-brand-700">{summary.score}</p>
              <p className="text-xs text-gray-500">성장 포인트</p>
            </div>
          </div>

          <div className="my-2 w-full rounded-2xl bg-gradient-to-b from-sky-50 to-brand-50/60 py-4">
            <PlantIllustration
              stage={summary.stage}
              pulse={pulseFor(studentId)}
              className="mx-auto h-48 w-full max-w-[280px] sm:h-56"
            />
          </div>

          <div className="w-full">
            <div className="mb-1 flex items-baseline justify-between">
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                style={{ backgroundColor: progress.current.accent }}
              >
                {progress.current.label}
              </span>
            </div>
            <p className="mb-2 text-sm text-gray-600">{progress.current.description}</p>
            <StageProgressBar progress={progress} showCaption />
          </div>

          {/* 통계 */}
          <dl className="mt-4 grid w-full grid-cols-3 gap-2 text-center">
            <StatTile label="누적 상점" value={summary.meritTotal} tone="brand" />
            <StatTile label="누적 벌점" value={summary.demeritTotal} tone="rose" />
            <StatTile label="성장 포인트" value={summary.score} tone="gray" />
          </dl>

          <div className="mt-4 w-full">
            <PointActionButtons
              studentName={student?.name ?? ''}
              size="detail"
              saving={loading || isSaving(studentId)}
              onRequest={(type) => student && recorder.open(student, type)}
            />
          </div>
        </section>

        {/* 성장 단계 안내 */}
        <section className={sectionCardClass}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-600">성장 단계</h2>
          <ol className="flex flex-col gap-1.5">
            {personalStages.map((config) => {
              const reached = summary.score >= config.minScore
              return (
                <li
                  key={config.stage}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                    config.stage === summary.stage ? 'bg-brand-50 font-semibold text-brand-700' : 'text-gray-600'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: reached ? config.accent : '#e5e7eb' }}
                    aria-hidden="true"
                  />
                  <span className="flex-1">{config.label}</span>
                  <span className="text-xs tabular-nums text-gray-400">{config.minScore}점~</span>
                </li>
              )
            })}
          </ol>
        </section>

        {/* 최근 기록 */}
        <section className={`${sectionCardClass} lg:col-span-2`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-600">
              최근 기록 {history.length > 0 && <span className="text-gray-400">({history.length})</span>}
            </h2>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmingReset(true)}
                className="text-xs font-medium text-gray-500 transition-colors hover:text-rose-600"
              >
                전체 초기화
              </button>
            )}
          </div>
          <GrowthLogTimeline entries={visibleHistory} onDelete={handleDelete} />
          {history.length > HISTORY_PREVIEW_COUNT && (
            <button
              type="button"
              onClick={() => setShowAllHistory((previous) => !previous)}
              className="mt-3 w-full rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              {showAllHistory ? '최근 10개만 보기' : `전체 기록 ${history.length}개 보기`}
            </button>
          )}
        </section>
      </div>

      {recorder.target && (
        <BehaviorPointModal
          target={recorder.target}
          saving={isSaving(recorder.target.student.id)}
          onClose={recorder.close}
          onSubmit={recorder.submit}
        />
      )}

      <GrowthFeedbackToast feedback={recorder.feedback} onDismiss={recorder.dismissFeedback} />

      {confirmingReset && (
        <ConfirmDialog
          title="기록을 모두 지울까요?"
          message={`${student?.name ?? '이 학생'}의 상점·벌점 기록이 모두 삭제되고 식물이 씨앗 단계로 돌아갑니다.`}
          confirmLabel="전체 삭제"
          onConfirm={async () => {
            await clearStudent(studentId)
            trigger(studentId, 'demerit')
            setConfirmingReset(false)
          }}
          onCancel={() => setConfirmingReset(false)}
        />
      )}
    </PageContainer>
  )
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: 'brand' | 'rose' | 'gray' }) {
  const toneClass = tone === 'brand' ? 'text-brand-700' : tone === 'rose' ? 'text-rose-600' : 'text-gray-700'
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-2 py-2">
      <dd className={`text-lg font-bold tabular-nums ${toneClass}`}>{value}</dd>
      <dt className="text-[11px] text-gray-500">{label}</dt>
    </div>
  )
}
