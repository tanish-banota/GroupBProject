import { useCallback, useState } from 'react'
import { DAY_ORDER, dayLabel, formatHour, formatMilitaryTime, militaryToMinutes, normalizeMeetingDay } from '../time'
import { useSchedule } from '../ScheduleContext'
import type { ScheduledSection } from '../types'
import ScheduleSectionModal from './ScheduleSectionModal'

const DEFAULT_START_MINUTES = 8 * 60
const DEFAULT_END_MINUTES = 22 * 60
const PIXELS_PER_HOUR = 60
/** Keeps hour labels (centered on the hour line) from clipping at the top/bottom edge. */
const AXIS_PAD = 10

interface Block {
  key: string
  sectionId: string
  day: string
  startMinutes: number
  endMinutes: number
  label: string
  detail: string
  conflicted: boolean
  column: number
  columnCount: number
}

/** Assigns side-by-side column slots to blocks that overlap in time, so overlapping meetings don't cover each other. */
function assignColumns(dayBlocks: Omit<Block, 'column' | 'columnCount'>[]): Block[] {
  const sorted = [...dayBlocks].sort((a, b) => a.startMinutes - b.startMinutes)
  const result: Block[] = []
  let cluster: (typeof sorted)[number][] = []
  let clusterEnd = -Infinity

  const flushCluster = () => {
    cluster.forEach((block, index) => {
      result.push({ ...block, column: index, columnCount: cluster.length })
    })
    cluster = []
  }

  for (const block of sorted) {
    if (cluster.length > 0 && block.startMinutes >= clusterEnd) {
      flushCluster()
      clusterEnd = -Infinity
    }
    cluster.push(block)
    clusterEnd = Math.max(clusterEnd, block.endMinutes)
  }
  flushCluster()

  return result
}

function buildBlocks(scheduled: ScheduledSection[], conflicts: Set<string>): Block[] {
  const raw: Omit<Block, 'column' | 'columnCount'>[] = []
  for (const section of scheduled) {
    for (const meeting of section.meetingTimes) {
      const day = normalizeMeetingDay(meeting.meeting_day)
      if (!day || !meeting.start_time_military || !meeting.end_time_military) continue
      raw.push({
        key: meeting.id,
        sectionId: section.sectionId,
        day,
        startMinutes: militaryToMinutes(meeting.start_time_military),
        endMinutes: militaryToMinutes(meeting.end_time_military),
        label: section.courseString,
        detail: [
          section.sectionNumber ? `Sec ${section.sectionNumber}` : null,
          `${formatMilitaryTime(meeting.start_time_military)}–${formatMilitaryTime(meeting.end_time_military)}`,
          meeting.building_code ? `${meeting.building_code} ${meeting.room_number ?? ''}`.trim() : null,
        ]
          .filter(Boolean)
          .join(' · '),
        conflicted: conflicts.has(section.sectionId),
      })
    }
  }

  const blocks: Block[] = []
  for (const day of DAY_ORDER) {
    blocks.push(...assignColumns(raw.filter((b) => b.day === day)))
  }
  return blocks
}

export default function ScheduleGrid({
  scheduled,
  conflicts,
  readOnly = false,
}: {
  scheduled: ScheduledSection[]
  conflicts: Set<string>
  readOnly?: boolean
}) {
  const { removeSection } = useSchedule()
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const closeModal = useCallback(() => setSelectedSectionId(null), [])
  const blocks = buildBlocks(scheduled, conflicts)
  const activeDays = DAY_ORDER
  const selected = selectedSectionId
    ? scheduled.find((section) => section.sectionId === selectedSectionId) ?? null
    : null

  const rangeStart = Math.min(DEFAULT_START_MINUTES, ...blocks.map((b) => b.startMinutes))
  const rangeEnd = Math.max(DEFAULT_END_MINUTES, ...blocks.map((b) => b.endMinutes))
  const totalHeight = ((rangeEnd - rangeStart) / 60) * PIXELS_PER_HOUR
  const bodyHeight = totalHeight + AXIS_PAD * 2
  const offsetY = (minutes: number) => AXIS_PAD + ((minutes - rangeStart) / 60) * PIXELS_PER_HOUR

  const hours: number[] = []
  for (let h = Math.floor(rangeStart / 60); h <= Math.ceil(rangeEnd / 60); h++) {
    hours.push(h * 60)
  }

  return (
    <>
      <div className="schedule-grid">
        <div className="schedule-grid__time-axis">
          <div className="schedule-grid__day-label schedule-grid__time-axis-header" aria-hidden="true" />
          <div className="schedule-grid__time-axis-body" style={{ height: bodyHeight }}>
            {hours.map((minutes) => (
              <div key={minutes} className="schedule-grid__hour-label" style={{ top: offsetY(minutes) }}>
                {formatHour(minutes)}
              </div>
            ))}
          </div>
        </div>
        {activeDays.map((day) => (
          <div className="schedule-grid__day" key={day}>
            <div className="schedule-grid__day-label">{dayLabel(day)}</div>
            <div className="schedule-grid__day-body" style={{ height: bodyHeight }}>
              {hours.map((minutes) => (
                <div key={minutes} className="schedule-grid__gridline" style={{ top: offsetY(minutes) }} />
              ))}
              {blocks
                .filter((b) => b.day === day)
                .map((block) => {
                  const widthPercent = 100 / block.columnCount
                  return (
                    <button
                      key={block.key}
                      type="button"
                      className={`schedule-grid__block${block.conflicted ? ' schedule-grid__block--conflict' : ''}`}
                      style={{
                        top: offsetY(block.startMinutes),
                        height: Math.max(((block.endMinutes - block.startMinutes) / 60) * PIXELS_PER_HOUR, 20),
                        left: `calc(${block.column * widthPercent}% + 3px)`,
                        width: `calc(${widthPercent}% - 6px)`,
                      }}
                      onClick={() => setSelectedSectionId(block.sectionId)}
                      aria-label={`${block.label} details`}
                    >
                      {block.conflicted && <span className="schedule-grid__conflict-badge">Conflict</span>}
                      <strong>{block.label}</strong>
                      <span>{block.detail}</span>
                    </button>
                  )
                })}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <ScheduleSectionModal
          section={selected}
          conflicted={conflicts.has(selected.sectionId)}
          onClose={closeModal}
          onRemove={readOnly ? undefined : () => removeSection(selected.sectionId)}
        />
      )}
    </>
  )
}
