import { describe, expect, it } from 'vitest'
import { isCourseQueryReady } from './courseSearch'

describe('isCourseQueryReady', () => {
  it('is ready when a subject code is present', () => {
    expect(isCourseQueryReady('198', '')).toBe(true)
  })

  it('is ready when search is at least two characters', () => {
    expect(isCourseQueryReady('', 'cs')).toBe(true)
  })

  it('is not ready for a single search character', () => {
    expect(isCourseQueryReady('', 'c')).toBe(false)
  })

  it('is not ready when both fields are empty', () => {
    expect(isCourseQueryReady('', '')).toBe(false)
  })
})
