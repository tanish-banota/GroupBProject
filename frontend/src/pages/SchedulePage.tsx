import CourseBrowsePanel from '../components/CourseBrowsePanel'
import ScheduleGrid from '../components/ScheduleGrid'
import ScheduleGenerator from '../components/ScheduleGenerator'
import { totalCredits } from '../schedule'
import { useSchedule } from '../ScheduleContext'
import { dayLabel, formatMilitaryTime } from '../time'

export default function SchedulePage() {
  const { scheduled, selectedCourses, conflicts, removeSection } = useSchedule()
  const credits = totalCredits(scheduled)

  return (
    <div className="schedule-layout">
      <CourseBrowsePanel />
      <div className="page">
        <h1>My schedule</h1>
        <ScheduleGenerator key={selectedCourses.map((course) => course.id).join('|')} />
        {scheduled.length > 0 && (
          <p className="muted">
            {scheduled.length} section{scheduled.length === 1 ? '' : 's'}
            {credits > 0 ? ` · ${credits} credit${credits === 1 ? '' : 's'}` : ''}
          </p>
        )}
        {scheduled.length === 0 && (
          <p className="muted">Add a course in the panel, then pick a section to see it on the calendar.</p>
        )}
        {conflicts.size > 0 && (
          <p className="error">Some sections have overlapping meeting times — check the highlighted blocks.</p>
        )}

        <ScheduleGrid scheduled={scheduled} conflicts={conflicts} />

        {scheduled.length > 0 && (
          <>
            <h2>Sections</h2>
            <ul className="section-list">
              {scheduled.map((section) => (
                <li key={section.sectionId} className="section-card">
                  <div className="section-card__header">
                    <span>
                      {section.courseString}
                      {section.sectionNumber ? ` · Sec ${section.sectionNumber}` : ''} — {section.courseTitle}
                    </span>
                    {conflicts.has(section.sectionId) && <span className="status-closed">Conflict</span>}
                  </div>
                  {section.instructorNames && <p className="muted">{section.instructorNames}</p>}
                  {section.credits != null && section.credits !== '' && (
                    <p className="muted">{section.credits} credits</p>
                  )}
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
                  <button type="button" className="secondary" onClick={() => removeSection(section.sectionId)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
