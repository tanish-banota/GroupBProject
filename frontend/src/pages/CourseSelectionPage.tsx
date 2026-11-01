import { Link, useSearchParams } from 'react-router-dom'
import CourseResultList from '../components/CourseResultList'
import CourseSearchForm from '../components/CourseSearchForm'
import { useSchedule } from '../ScheduleContext'
import { useCourseSearch } from '../useCourseSearch'

export default function CourseSelectionPage() {
  const [params, setParams] = useSearchParams()
  const subject = params.get('subject') ?? ''
  const search = params.get('search') ?? ''
  const { courses, loading, error, ready } = useCourseSearch(subject, search)
  const { selectedCourses, addCourse, removeCourse } = useSchedule()
  const selectedIds = new Set(selectedCourses.map((course) => course.id))

  const setFilter = (key: 'subject' | 'search', value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <div className="page">
      <h1>Select courses</h1>
      <p className="muted">
        Add courses you are considering. On My Schedule, pick a section to place it on the calendar.
      </p>

      <h2>Selected courses {selectedCourses.length > 0 && `(${selectedCourses.length})`}</h2>
      {selectedCourses.length === 0 ? (
        <p className="muted">Nothing selected yet. Search below, then add a course.</p>
      ) : (
        <ul className="course-list">
          {selectedCourses.map((course) => (
            <li key={course.id} className="course-row">
              <Link to={`/courses/${encodeURIComponent(course.id)}`} className="course-card course-card--row">
                <span className="course-card__code">{course.course_string ?? 'Unknown course'}</span>
                <span className="course-card__title">{course.title ?? course.expanded_title}</span>
                {course.credits != null && <span className="course-card__credits">{course.credits} cr</span>}
              </Link>
              <button type="button" className="secondary" onClick={() => removeCourse(course.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2>Find courses</h2>
      <CourseSearchForm
        subject={subject}
        search={search}
        onSubjectChange={(value) => setFilter('subject', value)}
        onSearchChange={(value) => setFilter('search', value)}
      />

      {!ready && <p className="muted">Enter a subject code (e.g. 198) or search a title.</p>}
      {ready && loading && <p className="muted">Loading courses…</p>}
      {error && <p className="error">Couldn't load courses: {error}</p>}
      {ready && !loading && !error && courses.length === 0 && <p className="muted">No courses match.</p>}

      {ready && !loading && !error && (
        <CourseResultList
          courses={courses}
          selectedIds={selectedIds}
          onAdd={addCourse}
          onRemove={removeCourse}
        />
      )}
    </div>
  )
}
