import { useEffect, useRef, useState } from 'react'
import { fetchSchoolEvents } from '../services/neis-service'
import type { SchoolEventByDate, SchoolSettings } from '../types'
import type { WeeklyFetchStatus } from './useWeeklyTimetable'

/** yearMonth is 'YYYY-MM' (matches AttendancePage's month state); converted to NEIS's 'YYYYMM' internally. */
export function useSchoolEvents(settings: SchoolSettings | null, yearMonth: string) {
  const [status, setStatus] = useState<WeeklyFetchStatus>('idle')
  const [eventsByDate, setEventsByDate] = useState<SchoolEventByDate>({})
  const [error, setError] = useState<string | null>(null)

  const fetchIdRef = useRef(0)

  useEffect(() => {
    if (!settings) {
      setStatus('idle')
      setEventsByDate({})
      setError(null)
      return
    }

    const fetchId = ++fetchIdRef.current
    setStatus('loading')
    setError(null)

    fetchSchoolEvents(settings, yearMonth.replace('-', '')).then((result) => {
      if (fetchIdRef.current !== fetchId) return
      if (result.error !== null) {
        setStatus('error')
        setError(result.error)
        return
      }
      setEventsByDate(result.data)
      setStatus('success')
    })
  }, [settings, yearMonth])

  return { status, eventsByDate, error }
}
