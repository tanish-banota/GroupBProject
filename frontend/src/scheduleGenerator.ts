import { wouldConflict } from './conflicts'
import { isSectionOpen, scheduledBelongsToCourse, toScheduledSection } from './schedule'
import type { Course, ScheduledSection, Section } from './types'

export function buildCourseOptions(
  courses: Course[],
  sectionGroups: Section[][],
  scheduled: ScheduledSection[],
  includeClosed: boolean,
  fixedIds: Set<string>,
): ScheduledSection[][] {
  return courses.map((course, index) => {
    const fixed = fixedIds.has(course.id)
      ? scheduled.find((section) => scheduledBelongsToCourse(section, course))
      : null
    return sectionGroups[index]
      .filter((section) => includeClosed || isSectionOpen(section))
      .filter((section) => !fixed || section.id === fixed.sectionId)
      .map((section) => toScheduledSection(course, section))
  })
}

/** Enumerates conflict-free combinations without materializing the full search space. */
export class ScheduleCombinationSearch {
  private readonly options: ScheduledSection[][]
  private readonly indexes: number[]
  private readonly chosen: ScheduledSection[] = []
  private depth = 0
  private done = false
  private buffered: ScheduledSection[] | null = null

  constructor(options: ScheduledSection[][]) {
    this.options = options
    this.indexes = options.map(() => 0)
    this.done = options.length === 0 || options.some((choices) => choices.length === 0)
  }

  private async nextOne(signal?: AbortSignal): Promise<ScheduledSection[] | null> {
    if (this.done) return null
    let steps = 0

    while (this.depth >= 0) {
      if (signal?.aborted) throw new DOMException('Search cancelled', 'AbortError')
      if (++steps % 1000 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0))

      if (this.depth === this.options.length) {
        const result = [...this.chosen]
        this.depth--
        this.indexes[this.depth]++
        return result
      }

      if (this.indexes[this.depth] >= this.options[this.depth].length) {
        this.indexes[this.depth] = 0
        this.chosen.length = this.depth
        this.depth--
        if (this.depth >= 0) this.indexes[this.depth]++
        continue
      }

      const candidate = this.options[this.depth][this.indexes[this.depth]]
      if (wouldConflict(this.chosen, candidate)) {
        this.indexes[this.depth]++
        continue
      }
      this.chosen[this.depth] = candidate
      this.depth++
    }

    this.done = true
    return null
  }

  async nextPage(count = 5, signal?: AbortSignal): Promise<{ schedules: ScheduledSection[][]; hasMore: boolean }> {
    const schedules: ScheduledSection[][] = []
    if (this.buffered) {
      schedules.push(this.buffered)
      this.buffered = null
    }
    while (schedules.length < count) {
      const schedule = await this.nextOne(signal)
      if (!schedule) return { schedules, hasMore: false }
      schedules.push(schedule)
    }
    this.buffered = await this.nextOne(signal)
    return { schedules, hasMore: this.buffered !== null }
  }
}
