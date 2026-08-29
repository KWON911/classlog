import { RotateCcw, Save } from 'lucide-react'
import { MAX_THRESHOLD, type Thresholds } from '../../../lib/growth-garden/growthSettings'

/** 정원 단계 표에는 색(accent)이 없으므로 선택 값으로 둔다. */
type StageRow = { label: string; accent?: string }

type ThresholdEditorProps = {
  title: string
  description: string
  /** 각 단계의 이름·색. 기준 점수는 values가 갖는다. */
  stages: StageRow[]
  values: Thresholds
  /** 점수 뒤에 붙는 단위 문구 — '점' 또는 '평균 점' */
  unitLabel: string
  error: string | null
  dirty: boolean
  saving: boolean
  isDefault: boolean
  onChange: (index: number, value: number) => void
  onReset: () => void
  onSave: () => void
  /** 편집 중인 값이 만들어 낼 결과 미리보기 */
  preview?: React.ReactNode
}

/**
 * 성장 기준 편집기 — 개인 식물과 학급 정원이 같은 컴포넌트를 쓴다.
 * 0단계는 항상 0점이라 입력칸 없이 고정으로 보여 준다.
 */
export function ThresholdEditor({
  title,
  description,
  stages,
  values,
  unitLabel,
  error,
  dirty,
  saving,
  isDefault,
  onChange,
  onReset,
  onSave,
  preview,
}: ThresholdEditorProps) {
  return (
    <div>
      <div className="mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-600">{title}</h2>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>

      <ul className="flex flex-col gap-1.5">
        {stages.map((stage, index) => (
          <li key={stage.label} className="flex items-center gap-3 rounded-lg px-1 py-1">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: stage.accent ?? '#cbd5e1' }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-sm text-gray-800">{stage.label}</span>
            {index === 0 ? (
              <span className="w-28 text-right text-sm text-gray-500">0{unitLabel} 고정</span>
            ) : (
              <span className="flex w-28 items-center justify-end gap-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_THRESHOLD}
                  value={Number.isFinite(values[index]) ? values[index] : ''}
                  onChange={(event) => onChange(index, Number(event.target.value))}
                  aria-label={`${stage.label} 기준 점수`}
                  className="h-9 w-20 rounded-lg border border-gray-300 px-2 text-right text-sm tabular-nums focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                <span className="text-sm text-gray-500">{unitLabel}</span>
              </span>
            )}
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      {preview && <div className="mt-4">{preview}</div>}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={onReset}
          disabled={isDefault && !dirty}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw size={15} aria-hidden="true" />
          기본값으로 되돌리기
        </button>

        {dirty && <span className="text-xs text-amber-700">저장하지 않은 변경이 있습니다.</span>}

        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || Boolean(error) || saving}
          className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-700 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save size={15} aria-hidden="true" />
          {saving ? '저장하는 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}
