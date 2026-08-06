import { useState } from 'react'
import { useSchoolSettings } from '../../lib/hooks/useSchoolSettings'
import { searchSchools } from '../../lib/services/neis-service'
import { schoolYearOf } from '../../lib/utils/date-utils'
import type { NeisSchoolSearchResult } from '../../lib/types'
import {
  cardDescriptionClass,
  cardTitleClass,
  fieldClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionCardClass,
} from '../../lib/ui/classNames'

const GRADES = ['1', '2', '3', '4', '5', '6']

export function SchoolSettingsSection() {
  const { settings, loading, error, saveSettings } = useSchoolSettings()

  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [results, setResults] = useState<NeisSchoolSearchResult[]>([])

  const [grade, setGrade] = useState(settings?.grade ?? '1')
  const [className, setClassName] = useState(settings?.class_name ?? '1')
  const [savingClass, setSavingClass] = useState(false)
  const [selectingSchoolCode, setSelectingSchoolCode] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const hasSchool = Boolean(settings?.school_code)

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setSearchError(null)
    const result = await searchSchools(query)
    setSearching(false)
    if (result.error !== null) {
      setSearchError(result.error)
      return
    }
    setResults(result.data)
  }

  const handleSelectSchool = async (school: NeisSchoolSearchResult) => {
    setSelectingSchoolCode(school.school_code)
    const response = await saveSettings({
      office_code: school.office_code,
      school_code: school.school_code,
      school_name: school.school_name,
      school_year: settings?.school_year ?? String(schoolYearOf(new Date())),
      grade: settings?.grade ?? grade,
      class_name: settings?.class_name ?? className,
    })
    setSelectingSchoolCode(null)
    if (!response.error) {
      setShowSearch(false)
      setResults([])
      setQuery('')
      setMessage(`${school.school_name}(으)로 학교를 설정했습니다.`)
    }
  }

  const handleSaveClass = async () => {
    if (!settings) return
    setSavingClass(true)
    const response = await saveSettings({
      office_code: settings.office_code,
      school_code: settings.school_code,
      school_name: settings.school_name,
      school_year: settings?.school_year ?? String(schoolYearOf(new Date())),
      grade,
      class_name: className,
    })
    setSavingClass(false)
    if (!response.error) {
      setMessage('학급 정보를 저장했습니다.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={sectionCardClass}>
        <h2 className={`mb-1 ${cardTitleClass}`}>학교 정보</h2>
        <p className={`mb-4 ${cardDescriptionClass}`}>홈 화면의 시간표·급식 조회에 사용할 학교를 설정합니다.</p>

        {loading ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-medium text-gray-900">{settings?.school_name ?? '설정되지 않음'}</p>
              {hasSchool && (
                <p className="mt-0.5 text-xs text-gray-400">
                  교육청 코드 {settings!.office_code} · 학교 코드 {settings!.school_code}
                </p>
              )}
            </div>
            <button type="button" onClick={() => setShowSearch((v) => !v)} className={secondaryButtonClass}>
              {hasSchool ? '학교 변경' : '학교 검색'}
            </button>
          </div>
        )}

        {showSearch && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="학교 이름으로 검색 (초등학교)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch()
                }}
                className={`${fieldClass} min-w-0 flex-1`}
              />
              <button type="button" onClick={handleSearch} disabled={searching} className={primaryButtonClass}>
                {searching ? '검색 중...' : '검색'}
              </button>
            </div>

            {searchError && (
              <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {searchError}
              </p>
            )}

            {results.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2">
                {results.map((school) => (
                  <li key={school.school_code}>
                    <button
                      type="button"
                      onClick={() => handleSelectSchool(school)}
                      disabled={selectingSchoolCode !== null}
                      className="w-full rounded-lg border border-gray-100 p-3 text-left transition-colors hover:border-brand-200 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {school.school_name}
                        {selectingSchoolCode === school.school_code && ' — 설정 중...'}
                      </p>
                      <p className="text-xs text-gray-500">{school.address}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className={sectionCardClass}>
        <h2 className={`mb-1 ${cardTitleClass}`}>학급 정보</h2>
        <p className={`mb-4 ${cardDescriptionClass}`}>시간표 조회에 필요한 학년·반입니다.</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            학년
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className={fieldClass}>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}학년
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            반
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className={fieldClass}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleSaveClass}
              disabled={!hasSchool || savingClass}
              className={`${primaryButtonClass} w-full`}
            >
              {savingClass ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
        {!hasSchool && <p className="mt-2 text-xs text-gray-400">먼저 위에서 학교를 설정해 주세요.</p>}
      </div>

      {error && (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700" aria-live="polite">
          저장하지 못했습니다: {error}
        </p>
      )}

      {message && !error && (
        <p className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-700" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  )
}
