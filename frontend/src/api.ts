import type { Course, Section } from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? '/api' : 'http://127.0.0.1:8000')

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`)
  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`)
  }
  return response.json() as Promise<T>
}

export function fetchCourses(
  params: { subject?: string; search?: string; limit?: number; offset?: number } = {},
): Promise<Course[]> {
  const query = new URLSearchParams()
  if (params.subject) query.set('subject', params.subject)
  if (params.search) query.set('search', params.search)
  if (params.limit != null) query.set('limit', String(params.limit))
  if (params.offset != null) query.set('offset', String(params.offset))
  const qs = query.toString()
  return getJson<Course[]>(`/courses${qs ? `?${qs}` : ''}`)
}

export function fetchSubjects(): Promise<string[]> {
  return getJson<string[]>('/subjects')
}

export function fetchCourse(courseId: string): Promise<Course> {
  return getJson<Course>(`/courses/${encodeURIComponent(courseId)}`)
}

export function fetchSections(courseId: string): Promise<Section[]> {
  return getJson<Section[]>(`/courses/${encodeURIComponent(courseId)}/sections`)
}
