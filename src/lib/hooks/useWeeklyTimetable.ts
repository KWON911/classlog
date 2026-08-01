import { useEffect, useRef, useState } from 'react'
import { buildWeeklyTimetable, getTimetableForRange } from '../services/neis-service'
import { weekdaysOf } from '../utils/date-utils'
import type { SchoolSettings, WeeklyTimetableDay } from '../types'

export type WeeklyFetchStatus = 'idle' | 'loading' | 'success' | 'error'

export function useWeeklyTimetable(settings: SchoolSettings | null, weekStart: Date, refreshToken: number) {
  const [status, setStatus] = useState<WeeklyFetchStatus>('idle')
  const [days, setDays] = useState<WeeklyTimetableDay[]>([])
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const fetchIdRef = useRef(0)
  const prevTriggerRef = useRef({ refreshToken, retryCount })

  useEffect(() => {
    if (!settings) {
      setStatus('idle')
      setDays([])
      return
    }

    const force = prevTriggerRef.current.refreshToken !== refreshToken || prevTriggerRef.current.retryCount !== retryCount
    prevTriggerRef.current = { refreshToken, retryCount }

    const fetchId = ++fetchIdRef.current
    setStatus('loading')
    setError(null)

    const weekdays = weekdaysOf(weekStart)
    getTimetableForRange(settings, weekdays[0], weekdays[4], { force }).then((result) => {
      if (fetchIdRef.current !== fetchId) return
      if (result.error !== null) {
        setStatus('error')
        setError(result.error)
        return
      }
      setDays(buildWeeklyTimetable(weekdays, result.data))
      setStatus('success')
    })
  }, [settings, weekStart, refreshToken, retryCount])

  return { status, days, error, retry: () => setRetryCount((c) => c + 1) }
}
