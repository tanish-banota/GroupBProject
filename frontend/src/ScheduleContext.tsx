import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { findConflicts } from './conflicts'
import type { ScheduledSection } from './types'

const STORAGE_KEY = 'rutgers-schedule'

interface ScheduleContextValue {
  scheduled: ScheduledSection[]
  conflicts: Set<string>
  addSection: (section: ScheduledSection) => void
  removeSection: (sectionId: string) => void
}

const ScheduleContext = createContext<ScheduleContextValue | null>(null)

function loadStoredSchedule(): ScheduledSection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ScheduledSection[]) : []
  } catch {
    return []
  }
}

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [scheduled, setScheduled] = useState<ScheduledSection[]>(loadStoredSchedule)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scheduled))
  }, [scheduled])

  const addSection = (section: ScheduledSection) => {
    setScheduled((prev) => (prev.some((s) => s.sectionId === section.sectionId) ? prev : [...prev, section]))
  }

  const removeSection = (sectionId: string) => {
    setScheduled((prev) => prev.filter((s) => s.sectionId !== sectionId))
  }

  const conflicts = useMemo(() => findConflicts(scheduled), [scheduled])

  return (
    <ScheduleContext.Provider value={{ scheduled, conflicts, addSection, removeSection }}>
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
