import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecordTimeline } from './RecordTimeline'

afterEach(cleanup)

describe('RecordTimeline', () => {
  it('reports the category selected for the timeline filter', () => {
    const onFilterChange = vi.fn()

    render(
      <RecordTimeline
        records={[]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onFilterChange={onFilterChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '학습' }))

    expect(onFilterChange).toHaveBeenLastCalledWith('학습')
  })

  it('reports all when the all filter is selected again', () => {
    const onFilterChange = vi.fn()

    render(
      <RecordTimeline
        records={[]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onFilterChange={onFilterChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '학습' }))
    fireEvent.click(screen.getByRole('button', { name: '전체' }))

    expect(onFilterChange).toHaveBeenLastCalledWith('all')
  })
})
