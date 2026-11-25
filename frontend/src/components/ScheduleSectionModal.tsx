import { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router-dom'
import { dayLabel, formatMilitaryTime } from '../time'
import type { ScheduledSection } from '../types'

export default function ScheduleSectionModal({
  section,
  conflicted,
  onClose,
  onRemove,
}: {
  section: ScheduledSection
  conflicted: boolean
  onClose: () => void
  onRemove?: () => void
}) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <h2 id={titleId} className="modal__title">
            {section.courseString}
            {section.sectionNumber ? ` · Sec ${section.sectionNumber}` : ''}
          </h2>
          <button ref={closeRef} type="button" className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <p className="modal__subtitle">{section.courseTitle}</p>
        {conflicted && <p className="error">This section conflicts with another meeting on your schedule.</p>}
        {section.instructorNames && <p className="muted">Instructor: {section.instructorNames}</p>}
        {section.credits != null && section.credits !== '' && (
          <p className="muted">{section.credits} credits</p>
        )}

        <h3 className="modal__section-heading">Meetings</h3>
        {section.meetingTimes.length === 0 ? (
          <p className="muted">No meeting times listed</p>
        ) : (
          <ul className="meeting-list">
            {section.meetingTimes.map((meeting) => {
              const hasTime = meeting.meeting_day || meeting.start_time_military || meeting.end_time_military
              const place = meeting.building_code
                ? `${meeting.building_code} ${meeting.room_number ?? ''}`.trim()
                : null
              return (
                <li key={meeting.id}>
                  {hasTime
                    ? `${dayLabel(meeting.meeting_day)} ${formatMilitaryTime(meeting.start_time_military)}–${formatMilitaryTime(meeting.end_time_military)}`
                    : (meeting.meeting_mode_description ?? 'No meeting time')}
                  {place && ` · ${place}`}
                  {hasTime && meeting.meeting_mode_description && ` · ${meeting.meeting_mode_description}`}
                </li>
              )
            })}
          </ul>
        )}

        <div className="modal__actions">
          {section.courseId && (
            <Link to={`/courses/${encodeURIComponent(section.courseId)}`} className="back-link" onClick={onClose}>
              Course details
            </Link>
          )}
          {onRemove && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                onRemove()
                onClose()
              }}
            >
              Remove from schedule
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
