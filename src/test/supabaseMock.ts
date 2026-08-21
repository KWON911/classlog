import { vi } from 'vitest'

type QueryResult<T> = { data: T; error: { message: string } | null }

const CHAIN_METHODS = ['select', 'order', 'eq', 'gte', 'lt', 'lte', 'insert', 'update', 'upsert', 'delete', 'range'] as const

export function createQueryBuilder<T>(result: QueryResult<T>) {
  const builder: Record<string, unknown> = {}

  for (const method of CHAIN_METHODS) {
    builder[method] = vi.fn(() => builder)
  }

  builder.single = vi.fn(() => Promise.resolve(result))
  builder.maybeSingle = vi.fn(() => Promise.resolve(result))
  builder.then = (
    onFulfilled: (value: QueryResult<T>) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(onFulfilled, onRejected)

  return builder
}
