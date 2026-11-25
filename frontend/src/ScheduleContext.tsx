import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { findConflicts } from './conflicts'
import { hasOtherSectionOfCourse, scheduledBelongsToCourse } from './schedule'
import { supabase } from './supabase'
import type { Course, ScheduledSection } from './types'

const SCHEDULE_KEY = 'rutgers-schedule'
const CART_KEY = 'rutgers-selected-courses'
const pendingKey = (userId: string) => `rutgers-pending-schedule:${userId}`

interface ScheduleContextValue {
  scheduled: ScheduledSection[]
  selectedCourses: Course[]
  conflicts: Set<string>
  addSection: (section: ScheduledSection) => void
  removeSection: (sectionId: string) => void
  addCourse: (course: Course) => void
  removeCourse: (courseId: string) => void
}

const ScheduleContext = createContext<ScheduleContextValue | null>(null)

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function ScheduleProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const [scheduled, setScheduled] = useState<ScheduledSection[]>([])
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([])
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [retrySave, setRetrySave] = useState(0)
  const lastSaved = useRef('')
  const latest = useRef('')
  const saveQueue = useRef(Promise.resolve())

  useEffect(() => {
    if (!supabase) return
    let active = true
    const client = supabase

    client.from('users').select('selected_courses, scheduled_sections').eq('id', userId).single()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setLoadError(`Couldn't load your schedule: ${error.message}`)
          return
        }

        const cloudCourses = Array.isArray(data.selected_courses) ? data.selected_courses as Course[] : []
        const cloudSections = Array.isArray(data.scheduled_sections) ? data.scheduled_sections as ScheduledSection[] : []
        const pending = loadStored<{ selectedCourses: Course[]; scheduled: ScheduledSection[] } | null>(pendingKey(userId), null)
        const legacyCourses = loadStored<Course[]>(CART_KEY, [])
        const legacySections = loadStored<ScheduledSection[]>(SCHEDULE_KEY, [])
        const importLegacy = !pending && cloudCourses.length === 0 && cloudSections.length === 0 &&
          (legacyCourses.length > 0 || legacySections.length > 0)
        const courses = pending && Array.isArray(pending.selectedCourses) ? pending.selectedCourses : importLegacy ? legacyCourses : cloudCourses
        const sections = pending && Array.isArray(pending.scheduled) ? pending.scheduled : importLegacy ? legacySections : cloudSections

        lastSaved.current = JSON.stringify({ selectedCourses: cloudCourses, scheduled: cloudSections })
        setSelectedCourses(courses)
        setScheduled(sections)
        setLoadError(null)
        setReady(true)
        if (!importLegacy) {
          localStorage.removeItem(CART_KEY)
          localStorage.removeItem(SCHEDULE_KEY)
        }
      })

    return () => { active = false }
  }, [userId, reload])

  useEffect(() => {
    if (!ready || !supabase) return
    const snapshot = JSON.stringify({ selectedCourses, scheduled })
    latest.current = snapshot
    if (snapshot === lastSaved.current) {
      localStorage.removeItem(pendingKey(userId))
      return
    }
    localStorage.setItem(pendingKey(userId), snapshot)
    const client = supabase

    const timer = window.setTimeout(() => {
      saveQueue.current = saveQueue.current.catch(() => undefined).then(async () => {
        const { error } = await client.from('users').update({
          selected_courses: selectedCourses,
          scheduled_sections: scheduled,
        }).eq('id', userId).select('id').single()
        if (error) {
          if (latest.current === snapshot) setSaveError(`Couldn't save your schedule: ${error.message}`)
          return
        }
        lastSaved.current = snapshot
        localStorage.removeItem(CART_KEY)
        localStorage.removeItem(SCHEDULE_KEY)
        if (latest.current === snapshot) {
          localStorage.removeItem(pendingKey(userId))
          setSaveError(null)
        }
      }).catch((error: unknown) => {
        if (latest.current === snapshot) {
          setSaveError(`Couldn't save your schedule: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      })
    }, 350)
    return () => window.clearTimeout(timer)
  }, [ready, selectedCourses, scheduled, userId, retrySave])

  const addSection = (section: ScheduledSection) => {
    setScheduled((prev) => {
      if (prev.some((s) => s.sectionId === section.sectionId)) return prev
      if (hasOtherSectionOfCourse(prev, section)) return prev
      return [...prev, section]
    })
  }

  const removeSection = (sectionId: string) => {
    setScheduled((prev) => prev.filter((s) => s.sectionId !== sectionId))
  }

  const addCourse = (course: Course) => {
    setSelectedCourses((prev) => (prev.some((c) => c.id === course.id) ? prev : [...prev, course]))
  }

  const removeCourse = (courseId: string) => {
    const course = selectedCourses.find((c) => c.id === courseId)
    setSelectedCourses((prev) => prev.filter((c) => c.id !== courseId))
    setScheduled((prev) => {
      if (course) return prev.filter((section) => !scheduledBelongsToCourse(section, course))
      return prev.filter((section) => section.courseId !== courseId)
    })
  }

  const conflicts = useMemo(() => findConflicts(scheduled), [scheduled])

  if (loadError) return (
    <main>
      <p role="alert" className="error">{loadError}</p>
      <button type="button" onClick={() => setReload((value) => value + 1)}>Retry loading</button>
    </main>
  )

  if (!ready) return <main><p>Loading your schedule…</p></main>

  return (
    <ScheduleContext.Provider
      value={{ scheduled, selectedCourses, conflicts, addSection, removeSection, addCourse, removeCourse }}
    >
      {saveError && (
        <div className="schedule-save-error" role="alert">
          {saveError} <button type="button" onClick={() => setRetrySave((value) => value + 1)}>Retry saving</button>
        </div>
      )}
      {children}
    </ScheduleContext.Provider>
  )
}

export function useSchedule(): ScheduleContextValue {
  const context = useContext(ScheduleContext)
  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider')
  }
  return context
}
