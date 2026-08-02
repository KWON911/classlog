import { useState, type ChangeEvent } from 'react'
import { decodeCsvBytes, parseStudentsCsv, type ParsedStudentRow, type SkippedRow } from '../lib/csv'
import { csvButtonClass, primaryButtonClass, secondaryButtonClass } from '../lib/ui/classNames'

type ImportStudentsPanelProps = {
  existingNumbers: Set<number>
  onImport: (rows: ParsedStudentRow[]) => Promise<{ error?: string }>
  onCancel: () => void
}

export function ImportStudentsPanel({ existingNumbers, onImport, onCancel }: ImportStudentsPanelProps) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [valid, setValid] = useState<ParsedStudentRow[]>([])
  const [skipped, setSkipped] = useState<SkippedRow[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileError(null)
    setImportError(null)
    setFileName(file.name)

    try {
      const bytes = await file.arrayBuffer()
      const text = decodeCsvBytes(bytes)
      const result = parseStudentsCsv(text, existingNumbers)

      if (result.valid.length === 0 && result.skipped.length === 0) {
        setFileError('파일에서 읽을 수 있는 내용이 없습니다.')
        setValid([])
        setSkipped([])
        return
      }

      setValid(result.valid)
      setSkipped(result.skipped)
    } catch {
      setFileError('파일을 읽을 수 없습니다.')
      setValid([])
      setSkipped([])
    }
  }

  const handleConfirm = async () => {
    setSubmitting(true)
    const result = await onImport(valid)
    setSubmitting(false)
    if (result.error) {
      setImportError(result.error)
      return
    }
    onCancel()
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">파일 선택</p>
        <div className="flex items-center gap-3">
          <label
            htmlFor="csv-file-input"
            className={`${csvButtonClass} cursor-pointer focus-within:ring-2 focus-within:ring-blue-300 focus-within:ring-offset-1`}
          >
            CSV 파일 선택
          </label>
          <input id="csv-file-input" type="file" accept=".csv" onChange={handleFileChange} className="sr-only" />
          <span className={`min-w-0 flex-1 truncate text-sm ${fileName ? 'text-gray-700' : 'text-gray-400'}`}>
            {fileName ?? '선택된 파일 없음'}
          </span>
        </div>

        {fileError && (
          <p className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {fileError}
          </p>
        )}
      </div>

      <div>
        <p className="text-sm text-gray-500">샘플 파일이 필요하면 아래를 이용하세요.</p>
        <a
          href="/sample-students.csv"
          download
          className="mt-1 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          샘플 파일 다운로드
        </a>
      </div>

      {(valid.length > 0 || skipped.length > 0) && (
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-600">
            추가될 학생 {valid.length}명 · 건너뛴 항목 {skipped.length}건
          </p>

          {valid.length > 0 && (
            <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto text-sm text-gray-700">
              {valid.map((row) => (
                <li key={row.number}>
                  {row.number}. {row.name} · {row.gender ?? '-'} · 부 {row.father_phone ?? '-'} · 모{' '}
                  {row.mother_phone ?? '-'}
                </li>
              ))}
            </ul>
          )}

          {skipped.length > 0 && (
            <ul className="flex max-h-32 flex-col gap-1 overflow-y-auto text-sm text-gray-500">
              {skipped.map((row, index) => (
                <li key={index}>
                  {row.raw.join(', ')} — {row.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {importError && (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{importError}</p>
      )}

      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
        <button type="button" onClick={onCancel} disabled={submitting} className={secondaryButtonClass}>
          취소
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting || valid.length === 0}
          className={primaryButtonClass}
        >
          {submitting ? '가져오는 중...' : '가져오기'}
        </button>
      </div>
    </div>
  )
}
