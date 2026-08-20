import { useEffect, useState } from 'react'
import { formatClockDisplay } from '../../lib/utils/date-utils'

export function LiveClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return <p className="text-2xl font-semibold tabular-nums text-brand-700">{formatClockDisplay(now)}</p>
}
