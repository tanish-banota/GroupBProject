import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchSections } from '../api'
import { wouldConflict } from '../conflicts'
import { toScheduledSection } from '../schedule'
import { useSchedule } from '../ScheduleContext'
import { dayLabel, formatMilitaryTime } from '../time'
import type { Course, Section } from '../types'
import { useCourseSearch } from '../useCourseSearch'
import CourseResultList from './CourseResultList'
import CourseSearchForm from './CourseSearchForm'

function CartCourseItem({
  course,
  expanded,
  onToggle,
}: {
  course: Course
  expanded: boolean
  onToggle: () => void
}) {
  const { scheduled, addSection, removeSection } = useSchedule()
  const [sections, setSections] = useState<Section[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!expanded || sections) return
    let cancelled = false
    setError(null)
    fetchSections(course.id)
      .then((data) => {
        if (!cancelled) setSections(data)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [expanded, sections, course.id])

  return (
    <li className="panel-course">
      <button type="button" className="panel-course__toggle" onClick={onToggle} aria-expanded={expanded}>
        <span className="course-card__code">{course.course_string ?? 'Unknown course'}</span>
        <span className="course-card__title">{course.title ?? course.expanded_title}</span>
        <span className="muted">{expanded ? 'Hide sections' : 'Show sections'}</span>
      </button>
      {expanded && (
        <div className="panel-course__body">
          {error && <p className="error">Couldn't load sections: {error}</p>}
          {!error && !sections && <p className="muted">Loading sections…</p>}
          {sections && sections.length === 0 && <p className="muted">No sections found for this course.</p>}
          {sections && sections.length > 0 && (
            <ul className="section-list">
              {sections.map((section) => {
                const candidate = toScheduledSection(course, section)
                const added = scheduled.some((s) => s.sectionId === section.id)
                const conflict = !added && wouldConflict(scheduled, candidate)
                return (
                  <li key={section.id} className="section-card section-card--compact">
                    <div className="section-card__header">
                      <span>Section {section.section_number}</span>
                      <span className={section.open_status ? 'status-open' : 'status-closed'}>
                        {section.open_status_text ?? (section.open_status ? 'OPEN' : 'CLOSED')}
                      </span>
                    </div>
                    {candidate.instructorNames && <p className="muted">{candidate.instructorNames}</p>}
                    <ul className="meeting-list">
                      {section.meeting_times.map((meeting) => (
                        <li key={meeting.id}>
                          {dayLabel(meeting.meeting_day)} {formatMilitaryTime(meeting.start_time_military)}–
                          {formatMilitaryTime(meeting.end_time_military)}
                          {meeting.building_code && ` · ${meeting.building_code} ${meeting.room_number ?? ''}`}
                        </li>
                      ))}
                    </ul>
                    {added ? (
                      <button type="button" className="secondary" onClick={() => removeSection(section.id)}>
                        Remove
                      </button>
                    ) : (
                      <button type="button" onClick={() => addSection(candidate)}>
                        {conflict ? 'Add (conflict)' : 'Add to schedule'}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          <Link to={`/courses/${encodeURIComponent(course.id)}`} className="back-link">
            Course details
          </Link>
        </div>
      )}
    </li>
  )
}

export default function CourseBrowsePanel() {
  const [subject, setSubject] = useState('')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { courses, loading, error, ready } = useCourseSearch(subject, search)
  const { selectedCourses, addCourse, removeCourse } = useSchedule()
  const selectedIds = new Set(selectedCourses.map((course) => course.id))

  const handleAdd = (course: Course) => {
    addCourse(course)
    setExpandedId(course.id)
  }

  return (
    <aside className="browse-panel">
      <h2>Browse courses</h2>
      <CourseSearchForm
        subject={subject}
        search={search}
        onSubjectChange={setSubject}
        onSearchChange={setSearch}
        stacked
      />
      {!ready && <p className="muted">Enter a subject code (e.g. 198) or search a title.</p>}
      {ready && loading && <p className="muted">Loading courses…</p>}
      {error && <p className="error">Couldn't load courses: {error}</p>}
      {ready && !loading && !error && courses.length === 0 && <p className="muted">No courses match.</p>}
      {ready && !loading && !error && (
        <CourseResultList
          courses={courses}
          selectedIds={selectedIds}
          onAdd={handleAdd}
          onRemove={removeCourse}
          compact
        />
      )}

      <h2>Selected courses {selectedCourses.length > 0 && `(${selectedCourses.length})`}</h2>
      {selectedCourses.length === 0 ? (
        <p className="muted">Add a course from search, then pick a section to place it on the calendar.</p>
      ) : (
        <ul className="course-list">
          {selectedCourses.map((course) => (
            <CartCourseItem
              key={course.id}
              course={course}
              expanded={expandedId === course.id}
              onToggle={() => setExpandedId((current) => (current === course.id ? null : course.id))}
            />
          ))}
        </ul>
      )}
    </aside>
  )
}
