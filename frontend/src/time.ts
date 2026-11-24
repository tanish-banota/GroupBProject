const DAY_LABELS: Record<string, string> = {
  M: 'Mon',
  T: 'Tue',
  W: 'Wed',
  TH: 'Thu',
  F: 'Fri',
  S: 'Sat',
  U: 'Sun',
}

export const DAY_ORDER = ['M', 'T', 'W', 'TH', 'F', 'S', 'U']

/** Rutgers SOC uses H for Thursday; normalize to the calendar's TH code. */
export function normalizeMeetingDay(code: string | null): string | null {
  if (!code) return null
  const trimmed = code.trim().toUpperCase()
  if (!trimmed) return null
  if (trimmed === 'H') return 'TH'
  return trimmed
}

export function dayLabel(code: string | null): string {
  const day = normalizeMeetingDay(code)
  if (!day) return '?'
  return DAY_LABELS[day] ?? day
}

export function militaryToMinutes(time: string): number {
  const padded = time.padStart(4, '0')
  return Number(padded.slice(0, 2)) * 60 + Number(padded.slice(2))
}

function formatMinutesSinceMidnight(totalMinutes: number): string {
  const hour24 = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`
}

export function formatMilitaryTime(time: string | null): string {
  if (!time) return '?'
  return formatMinutesSinceMidnight(militaryToMinutes(time))
}

export function formatHour(minutesSinceMidnight: number): string {
  return formatMinutesSinceMidnight(minutesSinceMidnight)
}
