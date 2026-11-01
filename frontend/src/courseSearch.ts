export const COURSE_RESULT_CAP = 100
export const MIN_SEARCH_LENGTH = 2
export const SEARCH_DEBOUNCE_MS = 300

export function isCourseQueryReady(subject: string, search: string): boolean {
  return subject.trim().length > 0 || search.trim().length >= MIN_SEARCH_LENGTH
}
