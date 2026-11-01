import type { Course, ScheduledSection, Section } from './types'

export function instructorNames(section: Section): string {
  return section.instructors
    .map((instructor) => instructor.name)
    .filter(Boolean)
    .join(', ')
}

export function toScheduledSection(course: Course, section: Section): ScheduledSection {
  return {
    sectionId: section.id,
    courseId: course.id,
    courseString: course.course_string ?? course.id,
    courseTitle: course.title ?? course.expanded_title ?? '',
    sectionNumber: section.section_number,
    instructorNames: instructorNames(section),
    meetingTimes: section.meeting_times,
    credits: course.credits ?? null,
  }
}

export function scheduledBelongsToCourse(section: ScheduledSection, course: Course): boolean {
  if (section.courseId === course.id) return true
  return Boolean(course.course_string && section.courseString === course.course_string)
}
