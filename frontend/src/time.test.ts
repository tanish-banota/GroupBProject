import { describe, expect, it } from 'vitest'
import { dayLabel, normalizeMeetingDay } from './time'

describe('normalizeMeetingDay', () => {
  it('maps Rutgers SOC H to Thursday', () => {
    expect(normalizeMeetingDay('H')).toBe('TH')
    expect(normalizeMeetingDay('h')).toBe('TH')
  })

  it('keeps standard weekday codes', () => {
    expect(normalizeMeetingDay('M')).toBe('M')
    expect(normalizeMeetingDay('TH')).toBe('TH')
    expect(normalizeMeetingDay('F')).toBe('F')
  })

  it('treats blank days as missing', () => {
    expect(normalizeMeetingDay(null)).toBeNull()
    expect(normalizeMeetingDay('')).toBeNull()
    expect(normalizeMeetingDay('   ')).toBeNull()
  })
})

describe('dayLabel', () => {
  it('labels SOC Thursday code as Thu', () => {
    expect(dayLabel('H')).toBe('Thu')
    expect(dayLabel('TH')).toBe('Thu')
  })
})
