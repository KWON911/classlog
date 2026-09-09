import { Modal } from './Modal'

type RecordGuideModalProps = {
  onClose: () => void
}

export function RecordGuideModal({ onClose }: RecordGuideModalProps) {
  return (
    <Modal
      title="누가기록 도움말"
      description="학생별 생활기록을 직접 남기거나 Google Form에서 자동으로 가져올 수 있습니다."
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
    >
      <div className="space-y-6 text-sm leading-6 text-gray-700">
        <section>
          <h3 className="font-semibold text-gray-900">1. 이 화면에서 직접 기록하기</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>오른쪽 위의 <strong>기록 추가</strong>를 누릅니다.</li>
            <li>카테고리와 내용을 입력한 뒤 추가합니다.</li>
            <li>아래 목록에서 카테고리를 선택하면 원하는 기록만 모아 볼 수 있습니다.</li>
          </ol>
        </section>

        <section className="rounded-xl bg-brand-50 p-4">
          <h3 className="font-semibold text-brand-900">Google Form으로 누가기록 남기기</h3>
          <p className="mt-2">
            Form에서 학생을 고르고 <strong>교사기록</strong>에 내용을 입력해 제출하면, 선택한 모든 학생의 생활지도
            기록에 자동으로 저장됩니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>수업 중 관찰 기록 같은 체크 항목은 저장하지 않고 교사기록 내용만 가져옵니다.</li>
            <li>여러 학생을 선택하면 같은 내용이 선택한 학생 각각의 기록으로 저장됩니다.</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-gray-900">새 학년도에 학생이 바뀌면</h3>
          <p className="mt-2">
            현재 Google Form을 계속 쓴다면 <strong>이름</strong> 선택지만 새 학생 명단으로 바꾸면 됩니다. Vercel,
            Supabase, Apps Script 설정은 다시 할 필요가 없습니다.
          </p>
          <p className="mt-2">
            새 Form을 만들 경우에는 질문 제목을 <strong>이름</strong>, <strong>교사기록</strong>으로 만들고, 새 Form의
            Apps Script에 연동 코드를 붙여 넣어 처음 설정만 다시 진행하세요.
          </p>
        </section>
      </div>
    </Modal>
  )
}
