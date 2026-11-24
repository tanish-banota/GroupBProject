import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchCourse, fetchSections } from '../api'
import { wouldConflict } from '../conflicts'
import { hasOtherSectionOfCourse, isSectionOpen, toScheduledSection } from '../schedule'
import { useSchedule } from '../ScheduleContext'
import { dayLabel, formatMilitaryTime } from '../time'
import type { Course, Section } from '../types'

export default function CoursePage() {
  const { courseId = '' } = useParams()
  const [course, setCourse] = useState<Course | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [error, setError] = useState<string | null>(null)
  const { scheduled, addSection, removeSection } = useSchedule()

  useEffect(() => {
    let cancelled = false
    setError(null)
    Promise.all([fetchCourse(courseId), fetchSections(courseId)])
      .then(([courseData, sectionData]) => {
        if (!cancelled) {
          setCourse(courseData)
          setSections(sectionData)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [courseId])

  if (error) return <p className="error">Couldn't load this course: {error}</p>
  if (!course) return <p className="muted">Loading…</p>

  const isScheduled = (sectionId: string) => scheduled.some((s) => s.sectionId === sectionId)

  return (
    <div className="page">
      <Link to="/" className="back-link">
        ← Back to course selection
      </Link>
      <h1>{course.course_string}</h1>
      <h2>{course.title ?? course.expanded_title}</h2>
      {course.credits != null && <p className="muted">{course.credits} credits</p>}
      {course.description && <p>{course.description}</p>}

      <h2>Sections</h2>
      {sections.length === 0 && <p className="muted">No sections found for this course.</p>}
      <ul className="section-list">
        {sections.map((section) => {
          const candidate = toScheduledSection(course, section)
          const added = isScheduled(section.id)
          const open = isSectionOpen(section)
          const otherSectionScheduled = !added && hasOtherSectionOfCourse(scheduled, candidate)
          const conflict = open && !added && !otherSectionScheduled && wouldConflict(scheduled, candidate)
          return (
            <li key={section.id} className="section-card">
              <div className="section-card__header">
                <span>Section {section.section_number}</span>
                <span className={open ? 'status-open' : 'status-closed'}>
                  {section.open_status_text ?? (open ? 'OPEN' : 'CLOSED')}
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
                <button
                  type="button"
                  disabled={!open || otherSectionScheduled}
                  onClick={() => addSection(candidate)}
                >
                  {!open
                    ? 'Closed'
                    : otherSectionScheduled
                      ? 'Already scheduled'
                      : conflict
                        ? 'Add (conflict)'
                        : 'Add to schedule'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
