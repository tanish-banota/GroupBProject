import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { findConflicts } from './conflicts'
import { scheduledBelongsToCourse } from './schedule'
import type { Course, ScheduledSection } from './types'

const SCHEDULE_KEY = 'rutgers-schedule'
const CART_KEY = 'rutgers-selected-courses'

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

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [scheduled, setScheduled] = useState<ScheduledSection[]>(() => loadStored(SCHEDULE_KEY, []))
  const [selectedCourses, setSelectedCourses] = useState<Course[]>(() => loadStored(CART_KEY, []))

  useEffect(() => {
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(scheduled))
  }, [scheduled])

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(selectedCourses))
  }, [selectedCourses])

  const addSection = (section: ScheduledSection) => {
    setScheduled((prev) => (prev.some((s) => s.sectionId === section.sectionId) ? prev : [...prev, section]))
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

  return (
    <ScheduleContext.Provider
      value={{ scheduled, selectedCourses, conflicts, addSection, removeSection, addCourse, removeCourse }}
    >
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
