import { useState, type ChangeEvent } from 'react'
import { decodeCsvBytes, parseStudentsCsv, type ParsedStudentRow, type SkippedRow } from '../lib/csv'

type ImportStudentsPanelProps = {
  existingNumbers: Set<number>
  onImport: (rows: ParsedStudentRow[]) => Promise<{ error?: string }>
  onCancel: () => void
}

export function ImportStudentsPanel({ existingNumbers, onImport, onCancel }: ImportStudentsPanelProps) {
  const [valid, setValid] = useState<ParsedStudentRow[]>([])
  const [skipped, setSkipped] = useState<SkippedRow[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [hasFile, setHasFile] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileError(null)
    setImportError(null)

    try {
      const bytes = await file.arrayBuffer()
      const text = decodeCsvBytes(bytes)
      const result = parseStudentsCsv(text, existingNumbers)

      if (result.valid.length === 0 && result.skipped.length === 0) {
        setFileError('파일에서 읽을 수 있는 내용이 없습니다.')
        setHasFile(false)
        return
      }

      setValid(result.valid)
      setSkipped(result.skipped)
      setHasFile(true)
    } catch {
      setFileError('파일을 읽을 수 없습니다.')
      setHasFile(false)
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
    <div className="flex flex-col gap-3">
      <input type="file" accept=".csv" onChange={handleFileChange} />

      {fileError && <p className="text-sm text-red-600">{fileError}</p>}

      {hasFile && (
        <>
          <p className="text-sm">
            추가될 학생 {valid.length}명 · 건너뛴 항목 {skipped.length}건
          </p>

          {valid.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {valid.map((row) => (
                <li key={row.number}>
                  {row.number}. {row.name} · {row.gender ?? '-'} · 본인 {row.student_phone ?? '-'} · 학부모{' '}
                  {row.parent_phone ?? '-'}
                </li>
              ))}
            </ul>
          )}

          {skipped.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm text-gray-500">
              {skipped.map((row, index) => (
                <li key={index}>
                  {row.raw.join(', ')} — {row.reason}
                </li>
              ))}
            </ul>
          )}

          {importError && <p className="text-sm text-red-600">{importError}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={submitting || valid.length === 0}
              className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
            >
              가져오기
            </button>
            <button type="button" onClick={onCancel} className="rounded border border-gray-300 px-3 py-2">
              취소
            </button>
          </div>
        </>
      )}
    </div>
  )
}
