import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCourses } from '../api'
import type { Course } from '../types'

export default function BrowsePage() {
  const [subject, setSubject] = useState('')
  const [search, setSearch] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchCourses({ subject: subject || undefined, search: search || undefined })
      .then((data) => {
        if (!cancelled) setCourses(data)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [subject, search])

  return (
    <div className="page">
      <h1>Browse courses</h1>
      <form className="filters" onSubmit={(e) => e.preventDefault()}>
        <input
          type="text"
          placeholder="Subject code (e.g. 198)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <input
          type="text"
          placeholder="Search title or course number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>

      {loading && <p className="muted">Loading courses…</p>}
      {error && <p className="error">Couldn't load courses: {error}</p>}
      {!loading && !error && courses.length === 0 && <p className="muted">No courses match.</p>}

      <ul className="course-list">
        {courses.map((course) => (
          <li key={course.id}>
            <Link to={`/courses/${encodeURIComponent(course.id)}`} className="course-card">
              <span className="course-card__code">{course.course_string ?? 'Unknown course'}</span>
              <span className="course-card__title">{course.title ?? course.expanded_title}</span>
              {course.credits != null && <span className="course-card__credits">{course.credits} cr</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
