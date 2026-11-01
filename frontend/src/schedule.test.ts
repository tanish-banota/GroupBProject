import { describe, expect, it } from 'vitest'
import { scheduledBelongsToCourse } from './schedule'
import type { Course, ScheduledSection } from './types'

const course: Course = {
  id: 'rutgers-soc:course:2026:9:NB:01:198:111',
  course_string: '01:198:111',
  subject_code: '198',
  course_number: '111',
  title: 'INTRO COMPUTER SCI',
  expanded_title: null,
  campus_code: 'NB',
  credits: 4,
  description: null,
}

function scheduled(overrides: Partial<ScheduledSection>): ScheduledSection {
  return {
    sectionId: 'section-1',
    courseString: '01:198:111',
    courseTitle: 'INTRO COMPUTER SCI',
    sectionNumber: '01',
    instructorNames: '',
    meetingTimes: [],
    ...overrides,
  }
}

describe('scheduledBelongsToCourse', () => {
  it('matches by course id', () => {
    expect(scheduledBelongsToCourse(scheduled({ courseId: course.id, courseString: 'other' }), course)).toBe(true)
  })

  it('matches older schedule rows that only stored the course string', () => {
    expect(scheduledBelongsToCourse(scheduled({ courseId: undefined }), course)).toBe(true)
  })

  it('does not match a different course', () => {
    expect(
      scheduledBelongsToCourse(
        scheduled({ courseId: 'other-id', courseString: '01:198:112' }),
        course,
      ),
    ).toBe(false)
  })
})
