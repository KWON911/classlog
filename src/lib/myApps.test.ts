import { describe, expect, it } from 'vitest'
import { MY_APPS } from './myApps'

describe('MY_APPS', () => {
  it('includes the Kalimba app', () => {
    expect(MY_APPS).toContainEqual(
      expect.objectContaining({
        name: '칼림바',
        url: 'https://k-kalimba.vercel.app/',
      }),
    )
  })
})
