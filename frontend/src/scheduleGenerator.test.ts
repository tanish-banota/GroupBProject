import { describe, expect, it } from 'vitest'
import { buildCourseOptions, ScheduleCombinationSearch } from './scheduleGenerator'
import type { Course, ScheduledSection, Section } from './types'

function section(sectionId: string, courseId: string, day: string, start: string, end: string): ScheduledSection {
  return {
    sectionId,
    courseId,
    courseString: courseId,
    courseTitle: courseId,
    sectionNumber: sectionId,
    instructorNames: '',
    meetingTimes: [{
      id: sectionId,
      section_id: sectionId,
      meeting_day: day,
      start_time_military: start,
      end_time_military: end,
      building_code: null,
      room_number: null,
      meeting_mode_description: null,
    }],
  }
}

describe('ScheduleCombinationSearch', () => {
  it('returns five at a time and continues without repeating results', async () => {
    const options = [
      Array.from({ length: 3 }, (_, i) => section(`a${i}`, 'a', 'M', `${String(i + 8).padStart(2, '0')}00`, `${String(i + 8).padStart(2, '0')}50`)),
      Array.from({ length: 3 }, (_, i) => section(`b${i}`, 'b', 'T', `${String(i + 8).padStart(2, '0')}00`, `${String(i + 8).padStart(2, '0')}50`)),
    ]
    const search = new ScheduleCombinationSearch(options)
    const first = await search.nextPage()
    const second = await search.nextPage()
    expect(first.schedules).toHaveLength(5)
    expect(first.hasMore).toBe(true)
    expect(second.schedules).toHaveLength(4)
    expect(second.hasMore).toBe(false)
    const ids = [...first.schedules, ...second.schedules].map((schedule) => schedule.map((s) => s.sectionId).join('/'))
    expect(new Set(ids).size).toBe(9)
  })

  it('skips overlapping sections and reports no solution when a course has no options', async () => {
    const a = section('a', 'a', 'M', '0900', '1000')
    const clash = section('b1', 'b', 'M', '0930', '1030')
    const compatible = section('b2', 'b', 'M', '1000', '1100')
    const search = new ScheduleCombinationSearch([[a], [clash, compatible]])
    expect((await search.nextPage()).schedules.map((schedule) => schedule.map((s) => s.sectionId))).toEqual([['a', 'b2']])
    expect((await new ScheduleCombinationSearch([[a], []]).nextPage()).schedules).toEqual([])
  })
})

describe('buildCourseOptions', () => {
  const course: Course = {
    id: 'course-a', course_string: '01:198:111', subject_code: '198', course_number: '111',
    title: 'Example', expanded_title: null, campus_code: 'NB', credits: 4, description: null,
  }
  const rawSection = (id: string, open: boolean): Section => ({
    id, course_id: course.id, registration_index: id, section_number: id,
    open_status: open, open_status_text: open ? 'OPEN' : 'CLOSED', instructors: [], meeting_times: [],
  })

  it('filters closed sections unless enabled, then honors a fixed section', () => {
    const sections = [[rawSection('open', true), rawSection('closed', false)]]
    expect(buildCourseOptions([course], sections, [], false, new Set())[0].map((s) => s.sectionId)).toEqual(['open'])
    expect(buildCourseOptions([course], sections, [], true, new Set())[0].map((s) => s.sectionId)).toEqual(['open', 'closed'])
    const fixed = section('closed', course.id, 'M', '0900', '1000')
    expect(buildCourseOptions([course], sections, [fixed], true, new Set([course.id]))[0].map((s) => s.sectionId)).toEqual(['closed'])
    expect(buildCourseOptions([course], sections, [fixed], false, new Set([course.id]))[0]).toEqual([])
  })
})
