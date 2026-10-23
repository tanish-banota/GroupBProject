import { describe, expect, it } from 'vitest'
import { findConflicts, timesOverlap } from './conflicts'
import type { MeetingTime, ScheduledSection } from './types'

function meeting(overrides: Partial<MeetingTime>): MeetingTime {
  return {
    id: 'm1',
    section_id: 's1',
    meeting_day: 'M',
    start_time_military: '0900',
    end_time_military: '1020',
    building_code: null,
    room_number: null,
    meeting_mode_description: null,
    ...overrides,
  }
}

function section(sectionId: string, meetingTimes: MeetingTime[]): ScheduledSection {
  return {
    sectionId,
    courseString: '01:198:111',
    courseTitle: 'INTRODUCTORY PROGRAMMING',
    sectionNumber: '01',
    instructorNames: '',
    meetingTimes,
  }
}

describe('timesOverlap', () => {
  it('detects overlapping ranges', () => {
    expect(timesOverlap('0900', '1020', '1000', '1120')).toBe(true)
  })

  it('treats back-to-back ranges as non-overlapping', () => {
    expect(timesOverlap('0900', '1020', '1020', '1140')).toBe(false)
  })

  it('detects fully disjoint ranges as non-overlapping', () => {
    expect(timesOverlap('0900', '1020', '1400', '1520')).toBe(false)
  })
})

describe('findConflicts', () => {
  it('flags two sections that overlap on the same day', () => {
    const a = section('a', [meeting({ meeting_day: 'M', start_time_military: '0900', end_time_military: '1020' })])
    const b = section('b', [meeting({ meeting_day: 'M', start_time_military: '1000', end_time_military: '1120' })])
    expect(findConflicts([a, b])).toEqual(new Set(['a', 'b']))
  })

  it('does not flag sections on different days', () => {
    const a = section('a', [meeting({ meeting_day: 'M', start_time_military: '0900', end_time_military: '1020' })])
    const b = section('b', [meeting({ meeting_day: 'T', start_time_military: '0900', end_time_military: '1020' })])
    expect(findConflicts([a, b])).toEqual(new Set())
  })

  it('does not flag non-overlapping sections on the same day', () => {
    const a = section('a', [meeting({ meeting_day: 'M', start_time_military: '0900', end_time_military: '1020' })])
    const b = section('b', [meeting({ meeting_day: 'M', start_time_military: '1400', end_time_military: '1520' })])
    expect(findConflicts([a, b])).toEqual(new Set())
  })
})
