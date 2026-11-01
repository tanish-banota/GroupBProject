import { useEffect, useState } from 'react'
import { fetchSubjects } from '../api'

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
  const listId = stacked ? 'subject-codes-panel' : 'subject-codes'

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

  return (
    <form className={stacked ? 'filters filters--stack' : 'filters'} onSubmit={(e) => e.preventDefault()}>
      <input
        type="text"
        list={listId}
        placeholder="Subject code (e.g. 198)"
        value={subject}
        onChange={(e) => onSubjectChange(e.target.value)}
        aria-label="Subject code"
      />
      <datalist id={listId}>
        {subjects.map((code) => (
          <option key={code} value={code} />
        ))}
      </datalist>
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
