import type { Course, ScheduledSection, Section } from './types'

/** Only explicitly open sections can be added to the schedule. */
export function isSectionOpen(section: Section): boolean {
  return section.open_status === true
}

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

function sameCourse(a: ScheduledSection, b: ScheduledSection): boolean {
  if (a.courseId && b.courseId) return a.courseId === b.courseId
  return Boolean(a.courseString && a.courseString === b.courseString)
}

/** True when another section of the same course is already on the schedule. */
export function hasOtherSectionOfCourse(scheduled: ScheduledSection[], candidate: ScheduledSection): boolean {
  return scheduled.some((section) => section.sectionId !== candidate.sectionId && sameCourse(section, candidate))
}

function parseCredits(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

/** Sum credits once per course (lecture + recitation of the same course should not double-count). */
export function totalCredits(scheduled: ScheduledSection[]): number {
  const seen = new Set<string>()
  let total = 0
  for (const section of scheduled) {
    const key = section.courseId ?? section.courseString
    if (!key || seen.has(key)) continue
    seen.add(key)
    const credits = parseCredits(section.credits)
    if (credits != null) total += credits
  }
  return total
}
