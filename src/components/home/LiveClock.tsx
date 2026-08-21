import { useEffect, useState } from 'react'
import { formatClockDateLine, formatClockTimeLine } from '../../lib/utils/date-utils'

export function LiveClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <p className="flex flex-wrap items-baseline gap-x-2 text-2xl font-semibold tabular-nums text-brand-700">
      <span className="whitespace-nowrap">{formatClockDateLine(now)}</span>
      <span className="whitespace-nowrap">{formatClockTimeLine(now)}</span>
    </p>
  )
}
