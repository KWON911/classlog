import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'kwontrol-sidebar-collapsed'
const DESKTOP_COLLAPSE_QUERY = '(max-width: 1279px)'

function readStoredCollapsed(): boolean | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === 'true') return true
    if (raw === 'false') return false
    return null
  } catch {
    return null
  }
}

function writeStoredCollapsed(value: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value))
  } catch {
    // UI-only preference — safe to lose silently (private browsing, quota, etc).
  }
}

/**
 * A user-chosen collapse state always wins. Absent one, the initial value
 * favors a collapsed sidebar below the 1280px desktop threshold (matches the
 * 768–1280px "아이콘 중심" tablet policy) and expanded at/above it.
 */
function computeDefaultCollapsed(): boolean {
  try {
    return window.matchMedia(DESKTOP_COLLAPSE_QUERY).matches
  } catch {
    return false
  }
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState<boolean>(() => readStoredCollapsed() ?? computeDefaultCollapsed())

  useEffect(() => {
    writeStoredCollapsed(collapsed)
  }, [collapsed])

  const toggle = useCallback(() => setCollapsed((prev) => !prev), [])

  return { collapsed, setCollapsed, toggle }
}
