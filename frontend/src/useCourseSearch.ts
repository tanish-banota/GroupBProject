import { useEffect, useState } from 'react'
import { fetchCourses } from './api'
import { COURSE_RESULT_CAP, isCourseQueryReady, SEARCH_DEBOUNCE_MS } from './courseSearch'
import type { Course } from './types'

function useDebouncedValue(value: string, delay = SEARCH_DEBOUNCE_MS): string {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])
  return debounced
}

export function useCourseSearch(subject: string, search: string): {
  courses: Course[]
  loading: boolean
  error: string | null
  ready: boolean
} {
  const debouncedSubject = useDebouncedValue(subject.trim())
  const debouncedSearch = useDebouncedValue(search.trim())
  const ready = isCourseQueryReady(debouncedSubject, debouncedSearch)
  const [courses, setCourses] = useState<Course[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!ready) {
      setCourses([])
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    fetchCourses({
      subject: debouncedSubject || undefined,
      search: debouncedSearch || undefined,
      limit: COURSE_RESULT_CAP,
    })
      .then((data) => {
        if (!cancelled) setCourses(data)
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setCourses([])
          setError(err.message)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [ready, debouncedSubject, debouncedSearch])

  return { courses, loading, error, ready }
}
