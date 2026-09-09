import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WeeklyMealCard } from './WeeklyMealCard'

vi.mock('../../lib/hooks/useWeeklyMeal', () => ({
  useWeeklyMeal: () => ({
    status: 'success',
    error: null,
    retry: vi.fn(),
    days: [
      { date: '20260907', dayLabel: '월', menus: ['밥'], calorie: '500kcal' },
      { date: '20260908', dayLabel: '화', menus: ['밥', '국', '반찬'], calorie: '600kcal' },
      { date: '20260909', dayLabel: '수', menus: ['밥'], calorie: '500kcal' },
      { date: '20260910', dayLabel: '목', menus: [], calorie: '' },
      { date: '20260911', dayLabel: '금', menus: ['밥'], calorie: '500kcal' },
    ],
  }),
}))

describe('WeeklyMealCard', () => {
  it('stretches every weekday box to the weekly grid height', () => {
    const { container } = render(
      <WeeklyMealCard
        settings={{
          teacher_id: 't1', office_code: 'o', school_code: 's', school_name: '학교', grade: '6', class_name: '1',
          school_year: '2026', updated_at: '2026-09-09T00:00:00Z',
        }}
        weekStart={new Date('2026-09-07')}
        refreshToken={0}
        isCurrentWeek={false}
      />,
    )

    expect(container.querySelector('.grid')).toHaveClass('items-stretch')
    expect(screen.getByRole('button', { name: '월요일 식단표 크게 보기' })).toHaveClass('h-full')
    expect(screen.getByText('급식 없음').parentElement).toHaveClass('h-full')
  })
})
