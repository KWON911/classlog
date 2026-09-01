import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, Sprout } from 'lucide-react'
import { GardenStudentCard } from './GardenStudentCard'
import { GardenView } from './GardenView'
import { SegmentedButton, SegmentedGroup } from './Segmented'
import { GardenPageNav } from './GardenPageNav'
import { BehaviorPointModal } from './BehaviorPointModal'
import { GrowthFeedbackToast } from './GrowthFeedbackToast'
import { ConfirmDialog } from '../ConfirmDialog'
import { SelectionToolbar } from './bulk/SelectionToolbar'
import { SelectionActionBar } from './bulk/SelectionActionBar'
import { BulkConfirmMessage } from './bulk/BulkConfirmMessage'
import { BulkBatchList } from './bulk/BulkBatchList'
import { useStudentSelection } from '../../lib/hooks/useStudentSelection'
import { useGrowthSettings } from '../../lib/growth-garden/growthSettingsContext'
import { useGrowthGarden } from '../../lib/hooks/useGrowthGarden'
import { usePlantPulse } from '../../lib/hooks/usePlantPulse'
import { useGrowthRecorder } from '../../lib/hooks/useGrowthRecorder'
import { GROWTH_GARDEN_DATA_SOURCE } from '../../lib/growth-garden/constants'
import { calculateGardenEnvironment } from '../../lib/growth-garden/environment'
import type { Student } from '../../lib/types'

type SortMode = 'number' | 'score'
/** 카드 보기가 기본 — 관리(기록) 작업이 주 용도이고, 정원 보기는 감상/확인용. */
type ViewMode = 'card' | 'garden'

type GrowthGardenBoardProps = {
  /** 페이지가 이미 불러온 공통 명단을 그대로 받는다(중복 조회 방지). */
  students: Student[]
  studentsLoading: boolean
  /**
   * 집계 타일 왼쪽에 들어갈 화면 제목·설명. 타일은 정원 데이터에서 계산되므로
   * 이 컴포넌트가 갖고 있어야 하는데, 제목까지 여기서 그리면 페이지가 자기 제목을
   * 못 갖는다. 그래서 슬롯으로 받아 같은 줄에 배치한다(왼쪽 여백 낭비 방지).
   */
  header?: ReactNode
}

/**
 * 성장정원 화면의 본문 — 학급 전체 화분 목록.
 * 명단은 공통 useStudents 데이터를 부모(GrowthGardenPage)에게서 받고,
 * 점수/기록만 성장정원 서비스(useGrowthGarden)에서 가져온다.
 */
export function GrowthGardenBoard({ students, studentsLoading, header }: GrowthGardenBoardProps) {
  const {
    entries,
    summaryFor,
    loading: gardenLoading,
    error,
    addPoint,
    addBulkPoints,
    deleteBatch,
    isSaving,
    bulkSaving,
    clearClass,
  } = useGrowthGarden()
  const { environmentStages } = useGrowthSettings()
  const { pulseFor, trigger } = usePlantPulse()
  const selection = useStudentSelection(students)
  const recorder = useGrowthRecorder({
    addPoint,
    addBulkPoints,
    trigger,
    // 저장 후 선택은 비우되 선택 모드는 유지한다 — 다음 그룹에 이어서 기록할 수 있게.
    onBulkSaved: selection.clear,
  })
  const [sortMode, setSortMode] = useState<SortMode>('number')
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetting, setResetting] = useState(false)

  // 기본은 번호순(교실에서 학생을 찾는 순서). 점수순은 교사가 명시적으로 고를 때만
  // 적용되며, 등수를 매기지 않도록 순위 숫자나 상/하위 강조는 붙이지 않는다.
  const visibleStudents = useMemo(() => {
    if (sortMode === 'number') return [...students].sort((a, b) => a.number - b.number)
    // 동점일 때는 번호순으로 안정화해서 목록이 매 렌더 흔들리지 않게 한다.
    return [...students].sort((a, b) => {
      const diff = summaryFor(b.id).score - summaryFor(a.id).score
      return diff !== 0 ? diff : a.number - b.number
    })
  }, [students, sortMode, summaryFor])

  const classTotals = useMemo(() => {
    let merit = 0
    let demerit = 0
    let bloomed = 0
    for (const student of students) {
      const summary = summaryFor(student.id)
      merit += summary.meritTotal
      demerit += summary.demeritTotal
      if (summary.stage >= 6) bloomed += 1
    }
    return { merit, demerit, bloomed }
  }, [students, summaryFor])

  // 배경 환경은 검색 결과가 아니라 학급 전체 기준 — 검색어를 입력했다고
  // 우리 반 정원 단계가 달라져 보이면 안 된다.
  const environment = useMemo(
    () => calculateGardenEnvironment(students.map((student) => summaryFor(student.id).score), environmentStages),
    [students, summaryFor, environmentStages],
  )

  const loading = studentsLoading || gardenLoading

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">{header}</div>
        <div className="flex shrink-0 gap-2 text-center">
          <SummaryTile label="누적 상점" value={classTotals.merit} tone="brand" />
          <SummaryTile label="누적 벌점" value={classTotals.demerit} tone="rose" />
          <SummaryTile label="꽃 핀 화분" value={classTotals.bloomed} tone="gray" />
        </div>
      </div>

      {GROWTH_GARDEN_DATA_SOURCE === 'mock' && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          현재 기록은 이 브라우저에만 저장됩니다(mock 모드). Supabase 연동 후에는 계정에 저장됩니다.
        </p>
      )}

      {/* 이동·주 동작·표시 제어를 분리한다. 카드/정원 전환으로 학생 선택 버튼이
          사라져도 정렬·보기 행의 시작선과 위치는 흔들리지 않는다. */}
      <div className="mb-4 space-y-2">
        <div data-testid="garden-primary-toolbar" className="flex min-h-9 flex-wrap items-center gap-2">
          <GardenPageNav />
          {/* 선택 모드는 카드 보기에서만 쓴다 — 정원 보기는 식물을 누르면 기록 모달이
              열리는 화면이라, 같은 누름이 선택도 되면 동작이 겹친다. */}
          {viewMode === 'card' && !selection.active && (
            <div className="flex w-full justify-end sm:ml-auto sm:w-auto">
              <SelectionToolbar classSize={students.length} onEnter={selection.enter} />
            </div>
          )}
        </div>
        {!selection.active && (
          <div data-testid="garden-display-toolbar" className="flex w-full flex-nowrap items-center gap-2">
            <SegmentedGroup label="정렬 기준">
              <SegmentedButton active={sortMode === 'number'} onClick={() => setSortMode('number')}>
                번호순
              </SegmentedButton>
              <SegmentedButton active={sortMode === 'score'} onClick={() => setSortMode('score')}>
                점수순
              </SegmentedButton>
            </SegmentedGroup>
            <SegmentedGroup label="보기 모드">
              <SegmentedButton active={viewMode === 'card'} onClick={() => setViewMode('card')}>
                <LayoutGrid size={14} aria-hidden="true" />
                카드 보기
              </SegmentedButton>
              <SegmentedButton active={viewMode === 'garden'} onClick={() => setViewMode('garden')}>
                <Sprout size={14} aria-hidden="true" />
                정원 보기
              </SegmentedButton>
            </SegmentedGroup>
          </div>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      {loading && <p className="py-16 text-center text-sm text-gray-500">정원을 불러오는 중...</p>}

      {!loading && students.length === 0 && (
        <div className="rounded-[14px] border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <p className="text-sm text-gray-600">아직 등록된 학생이 없습니다.</p>
          <Link to="/students/manage" className="mt-2 inline-block text-sm font-semibold text-brand-600 hover:underline">
            정보관리에서 학급 명단 등록하기
          </Link>
        </div>
      )}

      {/* 카드 보기 — 화단 위에 화분이 놓인 것처럼 보이게 감싼다. */}
      {!loading && visibleStudents.length > 0 && viewMode === 'card' && (
        <div className="rounded-[18px] bg-gradient-to-b from-brand-50/70 to-transparent p-3 sm:p-4">
          {/* 선택 조작은 카드 바로 위에 붙는다 — 인원 확인과 기록 버튼이 한 줄에 있다. */}
          {selection.active && (
            <SelectionActionBar
              classSize={students.length}
              selectedStudents={selection.selectedStudents}
              state={selection.state}
              saving={bulkSaving}
              onSelectAll={selection.selectAll}
              onClear={selection.clear}
              onExit={selection.exit}
              onRequest={(type) => recorder.openBulk(selection.selectedStudents, type)}
            />
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visibleStudents.map((student) => (
              <GardenStudentCard
                key={student.id}
                student={student}
                summary={summaryFor(student.id)}
                pulse={pulseFor(student.id)}
                saving={isSaving(student.id)}
                onRequestPoint={recorder.open}
                selectable={selection.active}
                selected={selection.isSelected(student.id)}
                onToggleSelect={selection.toggle}
              />
            ))}
          </div>
        </div>
      )}

      {/* 정원 보기 — 같은 데이터·같은 순서를 하나의 화단 장면으로 보여준다. */}
      {!loading && visibleStudents.length > 0 && viewMode === 'garden' && (
        <GardenView
          students={visibleStudents}
          summaryFor={summaryFor}
          pulseFor={pulseFor}
          isSaving={isSaving}
          onSelect={(student) => recorder.open(student, 'merit', { allowTypeChange: true })}
          environment={environment}
        />
      )}
      {!loading && students.length > 0 && (
        <BulkBatchList entries={entries} students={students} onCancelBatch={deleteBatch} />
      )}

      {/* 학급 전체 초기화 — 학기 초에나 쓰는 되돌릴 수 없는 동작이라, 수업 중 계속
          누르는 컨트롤들과 멀리 떨어진 목록 맨 아래에 둔다(정보관리의 '명단 전체
          삭제'와 같은 자리·같은 모양). 전체화면은 정원 컨테이너만 차지하므로
          발표 화면에는 이 버튼이 나타나지 않는다. */}
      {!loading && students.length > 0 && (
        <div className="mt-4 flex justify-end border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            disabled={entries.length === 0}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            학급 전체 기록 초기화
          </button>
        </div>
      )}

      {confirmingReset && (
        <ConfirmDialog
          title="학급 전체 기록 초기화"
          message={
            <>
              학생 <span className="font-medium text-gray-900">{students.length}명</span>의 상점·벌점 기록{' '}
              <span className="font-medium text-gray-900">{entries.length}건</span>이 모두 삭제되고
              <br />
              모든 식물이 씨앗 단계로 돌아갑니다. 이 작업은 되돌릴 수 없습니다.
            </>
          }
          confirmLabel="전체 초기화"
          pendingLabel="초기화 중..."
          pending={resetting}
          onCancel={() => setConfirmingReset(false)}
          onConfirm={async () => {
            setResetting(true)
            await clearClass()
            setResetting(false)
            setConfirmingReset(false)
          }}
        />
      )}

      {recorder.target && (
        <BehaviorPointModal
          target={recorder.target}
          saving={
            recorder.target.students.length > 1 ? bulkSaving : isSaving(recorder.target.students[0].id)
          }
          onClose={recorder.close}
          onSubmit={recorder.submit}
        />
      )}

      {/* 여러 학생의 기록이 한꺼번에 만들어지므로 저장 직전에 한 번 확인한다. */}
      {recorder.pendingBulk && (
        <ConfirmDialog
          title={recorder.pendingBulk.type === 'merit' ? '선택 학생 상점 지급' : '선택 학생 벌점 적용'}
          message={
            <BulkConfirmMessage
              students={recorder.pendingBulk.students}
              classSize={students.length}
              type={recorder.pendingBulk.type}
              amount={recorder.pendingBulk.amount}
              reason={recorder.pendingBulk.reason}
            />
          }
          confirmLabel={`${recorder.pendingBulk.students.length}명에게 ${
            recorder.pendingBulk.type === 'merit' ? '지급' : '적용'
          }`}
          pendingLabel="지급 중..."
          pending={bulkSaving}
          tone={recorder.pendingBulk.type === 'merit' ? 'brand' : 'danger'}
          onCancel={recorder.cancelBulk}
          onConfirm={recorder.confirmBulk}
        />
      )}

      <GrowthFeedbackToast feedback={recorder.feedback} onDismiss={recorder.dismissFeedback} />
    </div>
  )
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: 'brand' | 'rose' | 'gray' }) {
  const toneClass = tone === 'brand' ? 'text-brand-700' : tone === 'rose' ? 'text-rose-600' : 'text-gray-700'
  return (
    <div className="min-w-[76px] rounded-xl border border-gray-200 bg-white px-3 py-2">
      <p className={`text-lg font-bold tabular-nums ${toneClass}`}>{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  )
}
