import type { ScheduledSection } from './types'

export function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return Number(aStart) < Number(bEnd) && Number(bStart) < Number(aEnd)
}

/** Returns the sectionIds that have at least one meeting-time overlap with another scheduled section. */
export function findConflicts(scheduled: ScheduledSection[]): Set<string> {
  const conflicting = new Set<string>()
  for (let i = 0; i < scheduled.length; i++) {
    for (let j = i + 1; j < scheduled.length; j++) {
      const a = scheduled[i]
      const b = scheduled[j]
      for (const am of a.meetingTimes) {
        for (const bm of b.meetingTimes) {
          if (!am.meeting_day || am.meeting_day !== bm.meeting_day) continue
          if (!am.start_time_military || !am.end_time_military) continue
          if (!bm.start_time_military || !bm.end_time_military) continue
          if (timesOverlap(am.start_time_military, am.end_time_military, bm.start_time_military, bm.end_time_military)) {
            conflicting.add(a.sectionId)
            conflicting.add(b.sectionId)
          }
        }
      }
    }
  }
  return conflicting
}
