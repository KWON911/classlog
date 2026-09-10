import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RecordForm } from './RecordForm'

describe('RecordForm', () => {
  it('right-aligns the save and cancel action group', () => {
    render(
      <RecordForm
        submitLabel="기록 저장"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '기록 저장' }).parentElement).toHaveClass('justify-end')
  })
})
