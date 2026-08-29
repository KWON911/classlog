import { Sprout } from 'lucide-react'
import { PageContainer } from '../components/PageContainer'
import { GrowthGardenBoard } from '../components/growth-garden/GrowthGardenBoard'
import { useStudents } from '../lib/hooks/useStudents'

/**
 * /growth-garden — 학급 성장정원 메인 화면(사이드바 단독 항목).
 *
 * 학생 명단은 공통 `useStudents()`를 그대로 쓰고(성장정원 전용 명단을 따로 두지 않는다),
 * 상점/벌점 점수와 기록만 성장정원 서비스에서 가져온다.
 */
export function GrowthGardenPage() {
  const { students, loading } = useStudents()

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
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              상점과 벌점을 기록하면 학생의 식물이 자라거나 이전 단계로 돌아갑니다.
            </p>
          </>
        }
      />
    </PageContainer>
  )
}
