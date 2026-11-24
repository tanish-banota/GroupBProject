import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { fetchSubjects } from '../api'

const SUBJECT_SUGGESTION_CAP = 12

export default function CourseSearchForm({
  subject,
  search,
  onSubjectChange,
  onSearchChange,
  stacked = false,
}: {
  subject: string
  search: string
  onSubjectChange: (value: string) => void
  onSearchChange: (value: string) => void
  stacked?: boolean
}) {
  const [subjects, setSubjects] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => {
    let cancelled = false
    fetchSubjects()
      .then((codes) => {
        if (!cancelled) setSubjects(codes)
      })
      .catch(() => {
        if (!cancelled) setSubjects([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const suggestions = useMemo(() => {
    const query = subject.trim().toLowerCase()
    const matched = query
      ? subjects.filter((code) => code.toLowerCase().includes(query))
      : subjects
    return matched.slice(0, SUBJECT_SUGGESTION_CAP)
  }, [subject, subjects])

  useEffect(() => {
    setHighlight(0)
  }, [subject])

  const pick = (code: string) => {
    onSubjectChange(code)
    setOpen(false)
  }

  const onSubjectKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp') && suggestions.length > 0) {
      setOpen(true)
      return
    }
    if (!open || suggestions.length === 0) {
      if (event.key === 'Escape') setOpen(false)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlight((current) => (current + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((current) => (current - 1 + suggestions.length) % suggestions.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      pick(suggestions[highlight] ?? suggestions[0])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <form className={stacked ? 'filters filters--stack' : 'filters'} onSubmit={(e) => e.preventDefault()}>
      <div className="filters__subject" ref={rootRef}>
        <input
          type="text"
          placeholder="Subject code (e.g. 198)"
          value={subject}
          onChange={(e) => {
            onSubjectChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onSubjectKeyDown}
          aria-label="Subject code"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open && suggestions.length > 0}
          autoComplete="off"
        />
        {open && suggestions.length > 0 && (
          <ul id={listId} className="filters__suggestions" role="listbox">
            {suggestions.map((code, index) => (
              <li key={code} role="option" aria-selected={index === highlight}>
                <button
                  type="button"
                  className={
                    index === highlight
                      ? 'filters__suggestion filters__suggestion--active'
                      : 'filters__suggestion'
                  }
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(code)}
                  onMouseEnter={() => setHighlight(index)}
                >
                  {code}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <input
        type="text"
        placeholder="Search title or course number"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label="Search title or course number"
      />
    </form>
  )
}
