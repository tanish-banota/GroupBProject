import { useEffect, useRef, useState } from 'react'
import { fetchSections } from '../api'
import { findConflicts } from '../conflicts'
import { isSectionOpen, scheduledBelongsToCourse } from '../schedule'
import { buildCourseOptions, ScheduleCombinationSearch } from '../scheduleGenerator'
import { useSchedule } from '../ScheduleContext'
import type { ScheduledSection } from '../types'
import ScheduleGrid from './ScheduleGrid'

export default function ScheduleGenerator() {
  const { selectedCourses, scheduled, replaceSchedule } = useSchedule()
  const [includeClosed, setIncludeClosed] = useState(false)
  const [closedIds, setClosedIds] = useState<Set<string>>(new Set())
  const [fixedIds, setFixedIds] = useState<Set<string>>(new Set())
  const [pages, setPages] = useState<ScheduledSection[][][]>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const search = useRef<ScheduleCombinationSearch | null>(null)
  const controller = useRef<AbortController | null>(null)
  const request = useRef(0)

  useEffect(() => () => {
    request.current++
    controller.current?.abort()
  }, [])

  const clearResults = () => {
    request.current++
    controller.current?.abort()
    search.current = null
    setPages([])
    setClosedIds(new Set())
    setPageIndex(0)
    setPreviewIndex(0)
    setHasMore(false)
    setBusy(false)
    setError(null)
  }

  const toggleFixed = (courseId: string) => {
    clearResults()
    setFixedIds((previous) => {
      const next = new Set(previous)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      return next
    })
  }

  const generate = async () => {
    if (selectedCourses.length === 0) return
    clearResults()
    const current = request.current
    const abort = new AbortController()
    controller.current = abort
    setBusy(true)

    try {
      const allSections = await Promise.all(selectedCourses.map((course) => fetchSections(course.id)))
      if (current !== request.current) return
      setClosedIds(new Set(allSections.flat().filter((section) => !isSectionOpen(section)).map((section) => section.id)))

      const options = buildCourseOptions(selectedCourses, allSections, scheduled, includeClosed, fixedIds)
      const emptyIndex = options.findIndex((choices) => choices.length === 0)
      if (emptyIndex !== -1) {
        const course = selectedCourses[emptyIndex]
        setError(`No eligible sections for ${course.course_string ?? course.title ?? 'this course'}. Try including closed sections or changing a fixed section.`)
        return
      }

      const nextSearch = new ScheduleCombinationSearch(options)
      const first = await nextSearch.nextPage(5, abort.signal)
      if (current !== request.current) return
      search.current = nextSearch
      setPages(first.schedules.length ? [first.schedules] : [])
      setHasMore(first.hasMore)
      if (first.schedules.length === 0) setError('No conflict-free combinations found for these courses and fixed sections.')
    } catch (cause) {
      if (current === request.current && !(cause instanceof DOMException && cause.name === 'AbortError')) {
        setError(cause instanceof Error ? cause.message : 'Could not generate schedules.')
      }
    } finally {
      if (current === request.current) setBusy(false)
    }
  }

  const nextPage = async () => {
    if (pageIndex + 1 < pages.length) {
      setPageIndex(pageIndex + 1)
      setPreviewIndex(0)
      return
    }
    if (!search.current || !hasMore) return
    const current = request.current
    const abort = new AbortController()
    controller.current = abort
    setBusy(true)
    try {
      const next = await search.current.nextPage(5, abort.signal)
      if (current !== request.current) return
      setHasMore(next.hasMore)
      if (next.schedules.length > 0) {
        setPages((previous) => [...previous, next.schedules])
        setPageIndex((previous) => previous + 1)
        setPreviewIndex(0)
      }
    } catch (cause) {
      if (current === request.current && !(cause instanceof DOMException && cause.name === 'AbortError')) {
        setError(cause instanceof Error ? cause.message : 'Could not load more schedules.')
      }
    } finally {
      if (current === request.current) setBusy(false)
    }
  }

  const page = pages[pageIndex] ?? []
  const preview = page[previewIndex] ?? null
  const firstNumber = pageIndex * 5 + 1
  const hasUnknownTimes = preview?.some((section) => section.meetingTimes.length === 0 ||
    section.meetingTimes.some((meeting) => !meeting.meeting_day || !meeting.start_time_military || !meeting.end_time_military))

  return (
    <section className="schedule-generator" aria-labelledby="schedule-generator-title">
      <h2 id="schedule-generator-title">Generate schedules</h2>
      <p className="muted">Explore conflict-free combinations of one section per selected course, five at a time.</p>
      <label className="generator-toggle">
        <input type="checkbox" checked={includeClosed} onChange={(event) => { clearResults(); setIncludeClosed(event.target.checked) }} />
        Include closed sections
      </label>
      {scheduled.length > 0 && (
        <div className="generator-fixed">
          <strong>Keep a chosen section fixed</strong>
          {selectedCourses.map((course) => {
            const chosen = scheduled.find((section) => scheduledBelongsToCourse(section, course))
            if (!chosen) return null
            return (
              <label className="generator-toggle" key={course.id}>
                <input type="checkbox" checked={fixedIds.has(course.id)} onChange={() => toggleFixed(course.id)} />
                {course.course_string ?? course.title} · Section {chosen.sectionNumber ?? '?'}
              </label>
            )
          })}
        </div>
      )}
      <button type="button" onClick={() => void generate()} disabled={busy || selectedCourses.length === 0}>
        {busy ? 'Finding schedules…' : 'Generate schedules'}
      </button>
      {selectedCourses.length === 0 && <p className="muted">Select courses first to generate a schedule.</p>}
      {error && <p role="alert" className="error">{error}</p>}

      {page.length > 0 && (
        <>
          <div className="generator-pagination">
            <span>Schedules {firstNumber}–{firstNumber + page.length - 1}</span>
            <div>
              <button type="button" className="secondary" disabled={busy || pageIndex === 0} onClick={() => { setPageIndex(pageIndex - 1); setPreviewIndex(0) }}>Previous 5</button>
              <button type="button" className="secondary" disabled={busy || (pageIndex + 1 >= pages.length && !hasMore)} onClick={() => void nextPage()}>Next 5</button>
            </div>
          </div>
          <div className="generator-options">
            {page.map((combination, index) => (
              <button
                type="button"
                className={previewIndex === index ? 'generator-option active' : 'generator-option'}
                aria-pressed={previewIndex === index}
                key={combination.map((section) => section.sectionId).join('|')}
                onClick={() => setPreviewIndex(index)}
              >
                <strong>Option {firstNumber + index}</strong>
                <span>{combination.map((section) => `${section.courseString} sec ${section.sectionNumber ?? '?'}${closedIds.has(section.sectionId) ? ' (closed)' : ''}`).join(' · ')}</span>
              </button>
            ))}
          </div>
          {preview && (
            <div className="generator-preview">
              <h3>Preview option {firstNumber + previewIndex}</h3>
              {preview.some((section) => closedIds.has(section.sectionId)) && <p className="error">This option contains a closed section.</p>}
              {hasUnknownTimes && <p className="muted">Some sections have no complete meeting time, so those conflicts cannot be checked.</p>}
              <ScheduleGrid scheduled={preview} conflicts={findConflicts(preview)} readOnly />
              <button type="button" onClick={() => replaceSchedule(preview)}>Use this schedule</button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
