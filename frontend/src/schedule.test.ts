import { describe, expect, it } from 'vitest'
import { hasOtherSectionOfCourse, isSectionOpen, scheduledBelongsToCourse, totalCredits } from './schedule'
import type { Course, ScheduledSection, Section } from './types'

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

describe('isSectionOpen', () => {
  function section(open_status: boolean | null): Section {
    return {
      id: 's1',
      course_id: 'c1',
      registration_index: '12345',
      section_number: '01',
      open_status,
      open_status_text: null,
      instructors: [],
      meeting_times: [],
    }
  }

  it('allows only explicitly open sections', () => {
    expect(isSectionOpen(section(true))).toBe(true)
    expect(isSectionOpen(section(false))).toBe(false)
    expect(isSectionOpen(section(null))).toBe(false)
  })
})

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

describe('hasOtherSectionOfCourse', () => {
  it('detects another section of the same course', () => {
    const existing = scheduled({ sectionId: 'sec-1', courseId: course.id, courseString: course.course_string! })
    const other = scheduled({ sectionId: 'sec-2', courseId: course.id, courseString: course.course_string! })
    expect(hasOtherSectionOfCourse([existing], other)).toBe(true)
  })

  it('allows the same section id already on the schedule check to be false', () => {
    const existing = scheduled({ sectionId: 'sec-1', courseId: course.id })
    expect(hasOtherSectionOfCourse([existing], existing)).toBe(false)
  })

  it('allows a different course', () => {
    const existing = scheduled({ sectionId: 'sec-1', courseId: 'c1', courseString: '01:198:111' })
    const other = scheduled({ sectionId: 'sec-2', courseId: 'c2', courseString: '01:640:151' })
    expect(hasOtherSectionOfCourse([existing], other)).toBe(false)
  })
})

describe('totalCredits', () => {
  it('sums credits across different courses', () => {
    expect(
      totalCredits([
        scheduled({ sectionId: 'a', courseId: 'c1', courseString: '01:198:111', credits: 4 }),
        scheduled({ sectionId: 'b', courseId: 'c2', courseString: '01:640:151', credits: 4 }),
      ]),
    ).toBe(8)
  })

  it('counts a course once when multiple sections share it', () => {
    expect(
      totalCredits([
        scheduled({ sectionId: 'lec', courseId: course.id, courseString: course.course_string!, credits: 4 }),
        scheduled({ sectionId: 'rec', courseId: course.id, courseString: course.course_string!, credits: 4 }),
      ]),
    ).toBe(4)
  })

  it('parses string credits and skips missing values', () => {
    expect(
      totalCredits([
        scheduled({ sectionId: 'a', courseId: 'c1', credits: '3' }),
        scheduled({ sectionId: 'b', courseId: 'c2', credits: null }),
      ]),
    ).toBe(3)
  })
})
