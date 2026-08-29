import { useState } from 'react'
import { HelpCircle, Sprout } from 'lucide-react'
import { PageContainer } from '../components/PageContainer'
import { GrowthGardenBoard } from '../components/growth-garden/GrowthGardenBoard'
import { GardenGuideModal } from '../components/growth-garden/GardenGuideModal'
import { useStudents } from '../lib/hooks/useStudents'

/** 설명서를 한 번이라도 열어봤는지 — 처음 방문한 교사에게만 점으로 표시하기 위한 값. */
const GUIDE_SEEN_KEY = 'classlog:growth-garden:guide-seen'

function readGuideSeen(): boolean {
  try {
    return window.localStorage.getItem(GUIDE_SEEN_KEY) === 'true'
  } catch {
    // 저장소를 못 쓰는 환경(사파리 프라이빗 등)에서는 그냥 점을 띄우지 않는다.
    return true
  }
}

/**
 * /growth-garden — 학급 성장정원 메인 화면(사이드바 단독 항목).
 *
 * 학생 명단은 공통 `useStudents()`를 그대로 쓰고(성장정원 전용 명단을 따로 두지 않는다),
 * 상점/벌점 점수와 기록만 성장정원 서비스에서 가져온다.
 */
export function GrowthGardenPage() {
  const { students, loading } = useStudents()
  const [guideOpen, setGuideOpen] = useState(false)
  const [guideSeen, setGuideSeen] = useState(readGuideSeen)

  function openGuide() {
    setGuideOpen(true)
    setGuideSeen(true)
    try {
      window.localStorage.setItem(GUIDE_SEEN_KEY, 'true')
    } catch {
      // 저장 실패해도 설명서를 여는 데는 지장이 없다.
    }
  }

  return (
    <PageContainer size="wide">
      {/* 제목·설명은 집계 타일과 같은 줄에 들어간다 — 타일만 오른쪽에 두면
          왼쪽이 통째로 비어 화면 위쪽이 낭비된다. */}
      <GrowthGardenBoard
        students={students}
        studentsLoading={loading}
        header={
          <>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-brand-700">
              <Sprout size={24} aria-hidden="true" />
              학급 성장정원
              {/* 설명서는 처음 한두 번만 보는 내용이라 화면을 차지하지 않는 버튼으로 둔다.
                  아직 열어본 적 없으면 점을 하나 띄워 한 번은 눈에 띄게 한다. */}
              <button
                type="button"
                onClick={openGuide}
                aria-label="학급 성장정원 사용법 보기"
                className="relative flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                <HelpCircle size={18} aria-hidden="true" />
                {!guideSeen && (
                  <span
                    aria-hidden="true"
                    className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-canvas"
                  />
                )}
              </button>
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              상점과 벌점을 기록하면 학생의 식물이 자라거나 이전 단계로 돌아갑니다.
            </p>
          </>
        }
      />

      {guideOpen && <GardenGuideModal onClose={() => setGuideOpen(false)} />}
    </PageContainer>
  )
}
