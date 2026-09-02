import { useMemo, useState } from 'react'
import { PageContainer } from '../components/PageContainer'
import { GardenPageNav } from '../components/growth-garden/GardenPageNav'
import { ThresholdEditor } from '../components/growth-garden/settings/ThresholdEditor'
import { ClassGoalEditor } from '../components/growth-garden/settings/ClassGoalEditor'
import { PlantIllustration } from '../components/growth-garden/PlantIllustration'
import { GrowthFeedbackToast, type GrowthFeedback } from '../components/growth-garden/GrowthFeedbackToast'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useStudents } from '../lib/hooks/useStudents'
import { useGrowthGarden } from '../lib/hooks/useGrowthGarden'
import { useClassGardenGoal } from '../lib/hooks/useClassGardenGoal'
import { useGrowthSettings } from '../lib/growth-garden/growthSettingsContext'
import {
  DEFAULT_GARDEN_THRESHOLDS,
  DEFAULT_PERSONAL_THRESHOLDS,
  isDefaultThresholds,
  resolveEnvironmentStages,
  resolveGrowthStages,
  validateThresholds,
  type Thresholds,
} from '../lib/growth-garden/growthSettings'
import { calculateGardenEnvironment } from '../lib/growth-garden/environment'
import { sectionCardClass } from '../lib/ui/classNames'
import type { GrowthStage } from '../lib/growth-garden/constants'

type ResetTarget = 'personal' | 'garden' | null

/**
 * /growth-garden/settings — 성장 기준 설정(교사용).
 *
 * 기준 점수만 바꾼다. 학생의 성장 포인트·상벌점 기록·수상/보상 기록은 전혀 건드리지
 * 않고, "지금 점수가 어떤 단계로 보이는지"만 달라진다.
 */
export function GrowthGardenSettingsPage() {
  const { settings, save, loading: settingsLoading, error: settingsError } = useGrowthSettings()
  const { students, loading: studentsLoading } = useStudents()
  const { summaryFor, loading: gardenLoading } = useGrowthGarden()
  const today = new Date()
  const [goalYear, setGoalYear] = useState(today.getFullYear())
  const [goalMonth, setGoalMonth] = useState(today.getMonth() + 1)
  const {
    goal,
    unlocks,
    loading: goalLoading,
    dataReady: goalDataReady,
    error: goalError,
    refresh: refreshGoal,
    saveGoal,
  } = useClassGardenGoal(goalYear, goalMonth)

  const [personal, setPersonal] = useState<Thresholds>(settings.personal)
  const [garden, setGarden] = useState<Thresholds>(settings.garden)
  const [loadedFor, setLoadedFor] = useState(settings)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState<ResetTarget>(null)
  const [feedback, setFeedback] = useState<GrowthFeedback | null>(null)

  // 설정을 늦게 받아오므로, 도착하면 편집 중이 아닌 값만 갱신한다.
  if (loadedFor !== settings) {
    setLoadedFor(settings)
    setPersonal(settings.personal)
    setGarden(settings.garden)
  }

  const personalError = validateThresholds(personal)
  const gardenError = validateThresholds(garden)
  const personalDirty = !isDefaultThresholds(personal, settings.personal)
  const gardenDirty = !isDefaultThresholds(garden, settings.garden)

  const personalStages = useMemo(() => resolveGrowthStages(personal), [personal])
  const environmentStages = useMemo(() => resolveEnvironmentStages(garden), [garden])

  // 현재 학급 상태 — 등록된 학생만 대상으로 하고, 0명이면 0으로 안전하게 처리한다.
  const classScores = useMemo(
    () => students.map((student) => summaryFor(student.id).score),
    [students, summaryFor],
  )
  const previewEnvironment = useMemo(
    () => calculateGardenEnvironment(classScores, environmentStages),
    [classScores, environmentStages],
  )

  async function persist(next: { personal: Thresholds; garden: Thresholds }, message: string) {
    setSaving(true)
    const result = await save(next)
    setSaving(false)
    if (!result.error) setFeedback({ id: Date.now(), tone: 'grow', message })
  }

  const loading = settingsLoading || studentsLoading || gardenLoading

  return (
    <PageContainer size="standard" maxWidth="900px">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-brand-700">성장 기준 설정</h1>
        <p className="mt-1 text-sm text-gray-500">
          단계 이름은 그대로 두고 기준 점수만 학급에 맞게 조정합니다. 학생의 점수와 기록은 바뀌지 않습니다.
        </p>
      </div>

      <div data-testid="settings-navigation-toolbar" className="mb-4 flex min-h-9 items-center">
        <GardenPageNav />
      </div>

      {settingsError && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {settingsError}
        </p>
      )}
      {goalError && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span>{goalError}</span>
          <button type="button" onClick={() => void refreshGoal()} className="rounded-lg border border-amber-300 bg-white px-3 py-1 font-semibold hover:bg-amber-100">
            공동 목표 다시 불러오기
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          <div className="h-64 animate-pulse rounded-[12px] bg-gray-100" />
          <div className="h-64 animate-pulse rounded-[12px] bg-gray-100" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <section className={sectionCardClass}>
            <ThresholdEditor
              title="개인 식물 성장 기준"
              description="학생 한 명의 누적 성장 포인트가 이 점수를 넘으면 다음 단계로 자랍니다."
              stages={personalStages}
              values={personal}
              unitLabel="점"
              error={personalError}
              dirty={personalDirty}
              saving={saving}
              isDefault={isDefaultThresholds(personal, DEFAULT_PERSONAL_THRESHOLDS)}
              onChange={(index, value) =>
                setPersonal((previous) => previous.map((item, i) => (i === index ? value : item)))
              }
              onReset={() => setResetting('personal')}
              onSave={() => persist({ personal, garden: settings.garden }, '개인 성장 기준을 저장했습니다.')}
              preview={
                personalError ? null : (
                  <div>
                    <p className="mb-2 text-xs text-gray-500">이 기준이면 이렇게 보입니다</p>
                    <div className="-mx-1 overflow-x-auto pb-1">
                      <div className="flex min-w-max gap-1.5 px-1">
                        {personalStages.map((stage) => (
                          <div key={stage.stage} className="w-[76px] shrink-0 rounded-xl bg-brand-50/50 p-1 text-center">
                            <PlantIllustration stage={stage.stage as GrowthStage} variant="ground" className="h-14 w-full" />
                            <p className="text-[11px] font-semibold text-gray-800">{stage.label}</p>
                            <p className="text-[11px] tabular-nums text-gray-500">{stage.minScore}점~</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              }
            />
          </section>

          <section className={sectionCardClass}>
            <ThresholdEditor
              title="학급 정원 성장 기준"
              description="학급 정원 단계는 학생들의 현재 성장 포인트 평균을 기준으로 합니다."
              stages={environmentStages}
              values={garden}
              unitLabel="점"
              error={gardenError}
              dirty={gardenDirty}
              saving={saving}
              isDefault={isDefaultThresholds(garden, DEFAULT_GARDEN_THRESHOLDS)}
              onChange={(index, value) =>
                setGarden((previous) => previous.map((item, i) => (i === index ? value : item)))
              }
              onReset={() => setResetting('garden')}
              onSave={() => persist({ personal: settings.personal, garden }, '학급 정원 기준을 저장했습니다.')}
              preview={
                gardenError ? null : students.length === 0 ? (
                  <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">등록된 학생이 없습니다.</p>
                ) : (
                  <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <PreviewTile label="현재 학급 평균" value={`${previewEnvironment.averageScore.toFixed(1)}점`} />
                    <PreviewTile label="현재 정원 단계" value={previewEnvironment.current.label} />
                    <PreviewTile
                      label="다음 정원 단계"
                      value={previewEnvironment.next ? `평균 ${previewEnvironment.next.minAverage}점` : '마지막 단계'}
                    />
                    <PreviewTile
                      label="다음 단계까지"
                      value={
                        previewEnvironment.next
                          ? `평균 ${(previewEnvironment.next.minAverage - previewEnvironment.averageScore).toFixed(1)}점`
                          : '-'
                      }
                    />
                  </dl>
                )
              }
            />
          </section>

          <section className={sectionCardClass}>
            {goalLoading ? (
              <p className="py-8 text-center text-sm text-gray-500">공동 목표를 불러오는 중...</p>
            ) : goalDataReady ? (
              <ClassGoalEditor
                initialGoal={goal}
                unlockedTypes={new Set(unlocks.map((unlock) => unlock.decoration_type))}
                year={goalYear}
                month={goalMonth}
                onYearMonthChange={(year, month) => {
                  setGoalYear(year)
                  setGoalMonth(month)
                }}
                onSave={saveGoal}
              />
            ) : (
              <p className="py-8 text-center text-sm text-gray-500">공동 목표 데이터를 불러온 뒤 편집할 수 있습니다.</p>
            )}
          </section>
        </div>
      )}

      {resetting && (
        <ConfirmDialog
          title={resetting === 'personal' ? '개인 성장 기준 되돌리기' : '학급 정원 기준 되돌리기'}
          message={
            <>
              {resetting === 'personal' ? '개인 식물 성장 기준' : '학급 정원 성장 기준'}을 기본값으로 되돌릴까요?
              <br />
              학생의 성장 포인트와 상벌점 기록은 그대로 유지됩니다.
            </>
          }
          confirmLabel="되돌리기"
          pendingLabel="되돌리는 중..."
          onCancel={() => setResetting(null)}
          onConfirm={async () => {
            const target = resetting
            setResetting(null)
            if (target === 'personal') {
              setPersonal(DEFAULT_PERSONAL_THRESHOLDS)
              await persist(
                { personal: DEFAULT_PERSONAL_THRESHOLDS, garden: settings.garden },
                '개인 성장 기준을 기본값으로 되돌렸습니다.',
              )
            } else {
              setGarden(DEFAULT_GARDEN_THRESHOLDS)
              await persist(
                { personal: settings.personal, garden: DEFAULT_GARDEN_THRESHOLDS },
                '학급 정원 기준을 기본값으로 되돌렸습니다.',
              )
            }
          }}
        />
      )}

      <GrowthFeedbackToast feedback={feedback} onDismiss={() => setFeedback(null)} />
    </PageContainer>
  )
}

function PreviewTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
      <dd className="text-sm font-bold text-brand-700">{value}</dd>
      <dt className="text-[11px] text-gray-500">{label}</dt>
    </div>
  )
}
