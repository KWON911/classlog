import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useStudents } from '../../lib/hooks/useStudents'
import { useSearchIndex } from '../../lib/hooks/useSearchIndex'
import { searchAll } from '../../lib/utils/searchIndex'

function formatAttendanceDate(dateStr: string) {
  const [, month, day] = dateStr.split('-')
  return `${Number(month)}/${Number(day)}`
}

const resultButtonClass =
  'block w-full rounded px-2 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50'
const groupLabelClass = 'px-2 py-1 text-xs font-semibold text-gray-400'

export function HomeSearchBar() {
  const navigate = useNavigate()
  const { students } = useStudents()
  const { records, attendance } = useSearchIndex()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const results = searchAll(query, students, records, attendance)
  const hasQuery = query.trim().length >= 2
  const hasResults = results.students.length > 0 || results.records.length > 0 || results.attendance.length > 0

  const goTo = (path: string) => {
    navigate(path)
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative mb-5">
      <div className="flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3">
        <Search size={16} className="text-gray-400" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false)
          }}
          placeholder="이름, 전화번호, 기록 내용 검색..."
          aria-label="기록 찾기"
          className="w-full text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
      </div>

      {isOpen && hasQuery && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
          {!hasResults ? (
            <p className="px-3 py-2 text-sm text-gray-500">검색 결과가 없습니다.</p>
          ) : (
            <>
              {results.students.length > 0 && (
                <div className="px-1">
                  <p className={groupLabelClass}>학생</p>
                  {results.students.map((r) => (
                    <button
                      key={r.student.id}
                      type="button"
                      onClick={() => goTo(`/students/${r.student.id}`)}
                      className={resultButtonClass}
                    >
                      {r.student.number}번 {r.student.name} · {r.matchedLabel}: {r.matchedValue}
                    </button>
                  ))}
                </div>
              )}

              {results.records.length > 0 && (
                <div className="px-1">
                  <p className={groupLabelClass}>생활기록</p>
                  {results.records.map((r) => (
                    <button
                      key={r.record.id}
                      type="button"
                      onClick={() => goTo(`/students/${r.student.id}`)}
                      className={resultButtonClass}
                    >
                      {r.student.number}번 {r.student.name} · {r.record.category} · {r.record.content}
                    </button>
                  ))}
                </div>
              )}

              {results.attendance.length > 0 && (
                <div className="px-1">
                  <p className={groupLabelClass}>출결</p>
                  {results.attendance.map((r) => (
                    <button
                      key={r.entry.id}
                      type="button"
                      onClick={() => goTo(`/attendance?date=${r.entry.date.replace(/-/g, '')}&student=${r.student.id}`)}
                      className={resultButtonClass}
                    >
                      {r.student.number}번 {r.student.name} · {formatAttendanceDate(r.entry.date)} {r.entry.status}
                      {r.entry.note ? ` · ${r.entry.note}` : ''}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
