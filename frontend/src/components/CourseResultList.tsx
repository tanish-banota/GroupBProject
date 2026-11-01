import { Link } from 'react-router-dom'
import { COURSE_RESULT_CAP } from '../courseSearch'
import type { Course } from '../types'

export default function CourseResultList({
  courses,
  selectedIds,
  onAdd,
  onRemove,
  compact = false,
}: {
  courses: Course[]
  selectedIds: Set<string>
  onAdd: (course: Course) => void
  onRemove: (courseId: string) => void
  compact?: boolean
}) {
  const visible = courses.slice(0, COURSE_RESULT_CAP)

  return (
    <>
      {courses.length > 0 && (
        <p className="muted">
          {courses.length === COURSE_RESULT_CAP
            ? `Showing first ${COURSE_RESULT_CAP}. Narrow your search to see the rest.`
            : `${courses.length} result${courses.length === 1 ? '' : 's'}`}
        </p>
      )}
      <ul className="course-list">
        {visible.map((course, index) => {
          const selected = selectedIds.has(course.id)
          return (
            <li key={`${course.id}-${index}`} className={compact ? 'course-row course-row--compact' : 'course-row'}>
              <Link to={`/courses/${encodeURIComponent(course.id)}`} className="course-card course-card--row">
                <span className="course-card__code">{course.course_string ?? 'Unknown course'}</span>
                <span className="course-card__title">{course.title ?? course.expanded_title}</span>
                {course.credits != null && <span className="course-card__credits">{course.credits} cr</span>}
              </Link>
              {selected ? (
                <button type="button" className="secondary" onClick={() => onRemove(course.id)}>
                  Remove
                </button>
              ) : (
                <button type="button" onClick={() => onAdd(course)}>
                  Add course
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
