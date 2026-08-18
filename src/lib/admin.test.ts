import { describe, expect, it } from 'vitest'
import { isAdminEmail } from './admin'

describe('isAdminEmail', () => {
  it('recognizes the configured administrator regardless of casing or surrounding whitespace', () => {
    expect(isAdminEmail(' DOSUNG83@GMAIL.COM ')).toBe(true)
  })

  it('rejects every other account and missing email', () => {
    expect(isAdminEmail('teacher@example.com')).toBe(false)
    expect(isAdminEmail(undefined)).toBe(false)
  })
})
