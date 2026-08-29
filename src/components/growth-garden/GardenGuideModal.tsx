import { CalendarRange, Gift, LayoutGrid, Maximize2, Minus, Plus, Settings, Sprout, Tv } from 'lucide-react'
import { Modal } from '../Modal'
import { PlantIllustration } from './PlantIllustration'
import { MIN_SCORE, POINT_AMOUNT_OPTIONS } from '../../lib/growth-garden/constants'
import { useGrowthSettings } from '../../lib/growth-garden/growthSettingsContext'

type GardenGuideModalProps = {
  onClose: () => void
}

/**
 * 성장정원 사용 설명서.
 *
 * 단계 이름·기준 점수·정원 단계는 전부 constants에서 읽는다 — 설정을 바꿨을 때
 * 설명서만 옛날 숫자를 말하는 일이 없도록 하기 위함(문서가 코드를 따라간다).
 */
export function GardenGuideModal({ onClose }: GardenGuideModalProps) {
  // 설명서도 교사가 설정한 기준을 보여줘야 한다 — 화면과 다른 숫자를 안내하면 안 된다.
  const { personalStages, environmentStages } = useGrowthSettings()

  return (
    <Modal
      title="학급 성장정원 사용법"
      description="상점을 모으면 학생의 식물이 자라고, 우리 반 정원 전체도 함께 변합니다. 달마다 리포트와 성장상으로 돌아볼 수 있습니다."
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
    >
      <div className="flex flex-col gap-6">
        <GuideSection title="1. 상점·벌점 기록하기">
          <p>
            <strong className="font-semibold text-gray-900">카드 보기</strong>에서는 학생 카드의{' '}
            <InlineChip tone="brand">
              <Plus size={12} aria-hidden="true" />
            </InlineChip>
            (상점) ·{' '}
            <InlineChip tone="rose">
              <Minus size={12} aria-hidden="true" />
            </InlineChip>
            (벌점) 버튼을, <strong className="font-semibold text-gray-900">정원 보기</strong>에서는 학생의 식물을
            누르면 기록 창이 열립니다. 정원 보기에서는 창 안에서 상점·벌점을 고릅니다.
          </p>
          <p>
            점수는 {POINT_AMOUNT_OPTIONS.join(' · ')}점 중에서 고르고, 사유는 자주 쓰는 문구를 눌러 고르거나 직접
            입력할 수 있습니다. 1점과 첫 번째 사유가 미리 골라져 있어 수업 중에는 창을 열고 바로 기록해도 됩니다.
          </p>
        </GuideSection>

        <GuideSection title="2. 식물이 자라는 단계">
          <p>
            상점을 받아 성장 포인트가 쌓이면 식물이 다음 단계로 자랍니다. 벌점을 받으면 점수가 줄어 이전 모습으로
            부드럽게 돌아가며, {MIN_SCORE}점 아래로는 내려가지 않습니다.
          </p>
          <div className="-mx-1 overflow-x-auto pb-1">
            <div className="flex min-w-max gap-1.5 px-1">
              {personalStages.map((stage) => (
                <div key={stage.stage} className="w-[80px] shrink-0 rounded-xl bg-brand-50/50 px-1 pb-2 pt-1 text-center">
                  <PlantIllustration stage={stage.stage} variant="ground" className="h-16 w-full" />
                  <p className="mt-0.5 text-xs font-semibold text-gray-800">{stage.label}</p>
                  <p className="text-[11px] tabular-nums text-gray-500">{stage.minScore}점~</p>
                </div>
              ))}
            </div>
          </div>
        </GuideSection>

        <GuideSection title="3. 두 가지 보기">
          <p>
            <InlineChip>
              <LayoutGrid size={12} aria-hidden="true" /> 카드 보기
            </InlineChip>
            는 점수와 버튼이 함께 보이는 기록용 화면입니다.{' '}
            <InlineChip>
              <Sprout size={12} aria-hidden="true" /> 정원 보기
            </InlineChip>
            는 학급 전체가 하나의 화단에 심긴 모습으로, 식물에 마우스를 올리거나 키보드로 이동하면 단계와 남은
            점수가 나타납니다. 두 보기 모두 <strong className="font-semibold text-gray-900">번호순 · 점수순</strong>으로
            정렬할 수 있습니다.
          </p>
          <p>
            정원 보기의{' '}
            <InlineChip>
              <Maximize2 size={12} aria-hidden="true" /> 전체화면 보기
            </InlineChip>
            를 누르면 교실 화면에 크게 띄울 수 있습니다. 학생 수와 화면 크기에 맞춰 식물과 이름이 자동으로 커지고,
            ESC 키로 빠져나옵니다.
          </p>
        </GuideSection>

        <GuideSection title="4. 우리 반 정원">
          <p>
            정원 보기의 배경은 학급 전체의 성장 상태(학생 1인당 평균 점수)에 따라 {environmentStages.length}
            단계로 변합니다. 흙만 있던 자리에 잔디가 돋고, 풀과 꽃이 늘어납니다.
          </p>
          <ol className="flex flex-wrap gap-1.5">
            {environmentStages.map((stage) => (
              <li
                key={stage.stage}
                className="rounded-full border border-brand-100 bg-brand-50/60 px-2.5 py-1 text-xs text-brand-800"
              >
                {stage.label}
                <span className="ml-1 tabular-nums text-brand-600/70">평균 {stage.minAverage}점~</span>
              </li>
            ))}
          </ol>
        </GuideSection>

        <GuideSection title="5. 월별 리포트와 보상">
          <p>
            위쪽{' '}
            <InlineChip>
              <CalendarRange size={12} aria-hidden="true" /> 월별 리포트
            </InlineChip>
            에서는 달을 골라 <strong className="font-semibold text-gray-900">학급</strong> 전체 요약(상·벌점 합계,
            정원 단계 변화, 일별 추이, 사유별 집계)과 <strong className="font-semibold text-gray-900">개인</strong>{' '}
            리포트(월초·월말 식물 단계, 그달의 순 성장, 기록 목록)를 볼 수 있습니다.
          </p>
          <p>
            같은 화면에서{' '}
            <InlineChip>
              <Gift size={12} aria-hidden="true" /> 보상
            </InlineChip>
            을 학급 단위나 학생 개인 단위로 남길 수 있습니다. 보상은 기록일 뿐이라 지급하거나 지워도 학생의 성장
            포인트는 변하지 않습니다.
          </p>
        </GuideSection>

        <GuideSection title="6. 이달의 성장상과 축하 화면">
          <p>
            개인 리포트의 목록을 <strong className="font-semibold text-gray-900">성장순</strong>으로 두면 그달에 가장
            많이 자란 학생부터 보입니다. 자동으로 정해지지 않고 교사가{' '}
            <strong className="font-semibold text-gray-900">수상자로 선정</strong>을 눌러야 기록되며, 한 달에 여러
            명도 괜찮습니다.
          </p>
          <p>
            선정한 학생 옆의{' '}
            <InlineChip>
              <Tv size={12} aria-hidden="true" /> 축하 화면
            </InlineChip>
            을 누르면 교실에 띄울 학생용 화면이 나옵니다. 이 화면에는 등수나 벌점이 나오지 않습니다. 수상 역시
            성장 포인트와 별개라 취소해도 점수는 그대로입니다.
          </p>
        </GuideSection>

        <GuideSection title="7. 성장 기준 바꾸기">
          <p>
            <InlineChip>
              <Settings size={12} aria-hidden="true" /> 설정
            </InlineChip>
            에서 식물이 다음 단계로 자라는 점수와 우리 반 정원이 변하는 평균 점수를 학급에 맞게 조절할 수 있습니다.
            단계 이름은 그대로이고, 바꿔도 학생의 점수·상벌점 기록·보상과 수상 기록은 전혀 변하지 않습니다 —
            <strong className="font-semibold text-gray-900"> 지금 점수가 어떤 단계로 보이는지</strong>만 달라집니다.
          </p>
          <p>
            언제든 <strong className="font-semibold text-gray-900">기본값으로 되돌리기</strong>로 처음 기준으로 돌아갈
            수 있고, 이 설정은 선생님 계정에만 적용됩니다.
          </p>
        </GuideSection>

        <GuideSection title="8. 기록 관리">
          <p>
            학생 카드나 식물을 눌러 열리는 창에서 <strong className="font-semibold text-gray-900">자세히 보기</strong>
            로 들어가면 그 학생의 누적 상점·벌점과 최근 기록을 볼 수 있고, 잘못 넣은 기록은 하나씩 지울 수 있습니다.
            그 학생의 기록만 모두 지우려면 같은 화면의 <strong className="font-semibold text-gray-900">전체 초기화</strong>
            를 쓰세요.
          </p>
          <p>
            새 학기처럼 학급 전체를 처음부터 시작하려면 목록 맨 아래의{' '}
            <strong className="font-semibold text-red-600">학급 전체 기록 초기화</strong>를 누릅니다. 두 초기화 모두
            되돌릴 수 없으니 확인 창의 안내를 꼭 읽어 주세요.
          </p>
        </GuideSection>
      </div>
    </Modal>
  )
}

function GuideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-sm font-semibold text-brand-700">{title}</h3>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-gray-600">{children}</div>
    </section>
  )
}

function InlineChip({ tone = 'gray', children }: { tone?: 'gray' | 'brand' | 'rose'; children: React.ReactNode }) {
  const toneClass =
    tone === 'brand'
      ? 'border-brand-200 bg-brand-50 text-brand-700'
      : tone === 'rose'
        ? 'border-rose-200 bg-rose-50 text-rose-600'
        : 'border-gray-200 bg-gray-50 text-gray-700'
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-xs font-medium ${toneClass}`}
    >
      {children}
    </span>
  )
}
