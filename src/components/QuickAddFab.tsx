import { Plus } from 'lucide-react'

type QuickAddFabProps = {
  onClick: () => void
  label: string
}

/**
 * Mobile-only floating circular action button — an homage to Starbucks'
 * "Frap" order FAB (see DESIGN.md). Desktop keeps the header add-button as
 * the only entry point; this exists purely so the action stays reachable
 * on mobile without scrolling back to the top of a long roster.
 */
export function QuickAddFab({ onClick, label }: QuickAddFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-[0_0_6px_rgba(0,0,0,0.24),0_8px_12px_rgba(0,0,0,0.14)] transition-transform duration-150 active:scale-95 md:hidden"
      style={{ bottom: 'calc(var(--mobile-bottom-nav-height) + env(safe-area-inset-bottom) + 16px)' }}
    >
      <Plus size={26} aria-hidden="true" />
    </button>
  )
}
