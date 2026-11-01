import { Route, Routes, useLocation } from 'react-router-dom'
import NavBar from './components/NavBar'
import CoursePage from './pages/CoursePage'
import CourseSelectionPage from './pages/CourseSelectionPage'
import SchedulePage from './pages/SchedulePage'
import { ScheduleProvider } from './ScheduleContext'

export default function App() {
  const { pathname } = useLocation()

  return (
    <ScheduleProvider>
      <NavBar />
      <main className={pathname === '/schedule' ? 'main--wide' : undefined}>
        <Routes>
          <Route path="/" element={<CourseSelectionPage />} />
          <Route path="/courses/:courseId" element={<CoursePage />} />
          <Route path="/schedule" element={<SchedulePage />} />
        </Routes>
      </main>
    </ScheduleProvider>
  )
}
