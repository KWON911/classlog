import { useEffect } from 'react'
import type { AttendanceStatus } from '../lib/types'

type AttendanceDeleteConfirmModalProps = {
  studentName: string
  /** 'YYYY-MM-DD' */
  date: string
  status: AttendanceStatus
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

function formatDateKorean(dateStr: string) {
  const [, m, d] = dateStr.split('-').map(Number)
  return `${m}월 ${d}일`
}

export function AttendanceDeleteConfirmModal({
  studentName,
  date,
  status,
  deleting,
  onCancel,
  onConfirm,
}: AttendanceDeleteConfirmModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !deleting) onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, deleting])

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attendance-delete-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !deleting) onCancel()
      }}
    >
      <div
        className="w-full max-w-sm rounded-[18px] bg-white p-5"
        style={{ boxShadow: '0 20px 50px -12px rgba(15, 23, 42, 0.18)' }}
      >
        <h2 id="attendance-delete-title" className="text-base font-bold text-gray-900">
          출결 기록 삭제
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium text-gray-900">{studentName}</span> 학생의{' '}
          <span className="font-medium text-gray-900">
            {formatDateKorean(date)} {status}
          </span>{' '}
          기록을 삭제할까요?
          <br />
          삭제하면 해당 날짜는 출석으로 처리됩니다.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="h-9 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="h-9 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? '삭제 중...' : '기록 삭제'}
          </button>
        </div>
      </div>
    </div>
  )
}
