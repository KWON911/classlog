// Shared Tailwind class tokens for form fields/buttons/cards — single source so
// SeatingPage, StudentForm, RecordForm etc. never drift into slightly different
// input/button styling from each other.
export const fieldClass =
  'h-11 rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100'

export const textareaClass =
  'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100'

export const labelClass = 'flex flex-col gap-1 text-sm font-medium text-gray-700'

export const primaryButtonClass =
  'h-11 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'

export const secondaryButtonClass =
  'h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50'

export const secondaryActiveButtonClass =
  'h-11 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100'

export const dangerButtonClass =
  'h-11 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100'

export const sectionCardClass = 'rounded-[14px] border border-gray-200 p-5 sm:p-6'
