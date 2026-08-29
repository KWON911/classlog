import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, Search, Sprout } from 'lucide-react'
import { GardenStudentCard } from './GardenStudentCard'
import { GardenView } from './GardenView'
import { SegmentedButton, SegmentedGroup } from './Segmented'
import { BehaviorPointModal } from './BehaviorPointModal'
import { GrowthFeedbackToast } from './GrowthFeedbackToast'
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
  const { summaryFor, loading: gardenLoading, error, addPoint, isSaving } = useGrowthGarden()
  const { pulseFor, trigger } = usePlantPulse()
  const recorder = useGrowthRecorder({ addPoint, trigger })
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('number')
  const [viewMode, setViewMode] = useState<ViewMode>('card')

  // 기본은 번호순(교실에서 학생을 찾는 순서). 점수순은 교사가 명시적으로 고를 때만
  // 적용되며, 등수를 매기지 않도록 순위 숫자나 상/하위 강조는 붙이지 않는다.
  const visibleStudents = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    const filtered = trimmed
      ? students.filter(
          (student) => student.name.toLowerCase().includes(trimmed) || String(student.number).includes(trimmed),
        )
      : students
    if (sortMode === 'number') return [...filtered].sort((a, b) => a.number - b.number)
    // 동점일 때는 번호순으로 안정화해서 목록이 매 렌더 흔들리지 않게 한다.
    return [...filtered].sort((a, b) => {
      const diff = summaryFor(b.id).score - summaryFor(a.id).score
      return diff !== 0 ? diff : a.number - b.number
    })
  }, [students, query, sortMode, summaryFor])

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
    () => calculateGardenEnvironment(students.map((student) => summaryFor(student.id).score)),
    [students, summaryFor],
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

      {/* 툴바 — 좁은 화면에서는 검색창이 한 줄을 다 쓰고 토글이 아래로 내려간다
          (셋을 한 줄에 넣으면 모바일에서 검색창이 아이콘만 남을 만큼 찌그러진다). */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 sm:w-auto sm:max-w-xs sm:flex-none">
          <Search size={16} className="shrink-0 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="학생 이름 · 번호 검색..."
            aria-label="학생 검색"
            className="w-full min-w-0 text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
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

      {!loading && students.length > 0 && visibleStudents.length === 0 && (
        <p className="py-16 text-center text-sm text-gray-500">'{query.trim()}'와(과) 일치하는 학생이 없습니다.</p>
      )}

      {/* 카드 보기 — 화단 위에 화분이 놓인 것처럼 보이게 감싼다. */}
      {!loading && visibleStudents.length > 0 && viewMode === 'card' && (
        <div className="rounded-[18px] bg-gradient-to-b from-brand-50/70 to-transparent p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visibleStudents.map((student) => (
              <GardenStudentCard
                key={student.id}
                student={student}
                summary={summaryFor(student.id)}
                pulse={pulseFor(student.id)}
                saving={isSaving(student.id)}
                onRequestPoint={recorder.open}
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
      {recorder.target && (
        <BehaviorPointModal
          target={recorder.target}
          saving={isSaving(recorder.target.student.id)}
          onClose={recorder.close}
          onSubmit={recorder.submit}
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
