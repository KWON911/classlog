import type { CSSProperties, ReactNode } from 'react'

export type PageContainerSize = 'standard' | 'wide' | 'full'

// standard: settings/forms/detail screens. wide: home/roster/attendance.
// full: seating — needs the most room for the seat grid itself.
const SIZE_MAX_WIDTH: Record<PageContainerSize, string> = {
  standard: '1120px',
  wide: '1500px',
  full: '1600px',
}

type PageContainerProps = {
  size: PageContainerSize
  /** Overrides the size preset's max-width (e.g. the student detail page's ~1200px). */
  maxWidth?: string
  className?: string
  children: ReactNode
}

export function PageContainer({ size, maxWidth, className = '', children }: PageContainerProps) {
  const style: CSSProperties = { maxWidth: maxWidth ?? SIZE_MAX_WIDTH[size] }

  return (
    <div className={`page-container ${className}`.trim()} style={style}>
      {children}
    </div>
  )
}
