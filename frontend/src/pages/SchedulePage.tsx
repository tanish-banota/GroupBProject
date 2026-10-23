import ScheduleGrid from '../components/ScheduleGrid'
import { useSchedule } from '../ScheduleContext'

export default function SchedulePage() {
  const { scheduled, conflicts, removeSection } = useSchedule()

  return (
    <div className="page">
      <h1>My schedule</h1>
      {scheduled.length === 0 && <p className="muted">Add sections from the course browser to see them here.</p>}
      {conflicts.size > 0 && <p className="error">Some sections have overlapping meeting times — check the highlighted blocks.</p>}

      <ScheduleGrid scheduled={scheduled} conflicts={conflicts} />

      {scheduled.length > 0 && (
        <>
          <h2>Sections</h2>
          <ul className="section-list">
            {scheduled.map((section) => (
              <li key={section.sectionId} className="section-card">
                <div className="section-card__header">
                  <span>
                    {section.courseString} — {section.courseTitle}
                  </span>
                  {conflicts.has(section.sectionId) && <span className="status-closed">Conflict</span>}
                </div>
                <button type="button" className="secondary" onClick={() => removeSection(section.sectionId)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
