import { Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar'
import BrowsePage from './pages/BrowsePage'
import CoursePage from './pages/CoursePage'
import SchedulePage from './pages/SchedulePage'
import { ScheduleProvider } from './ScheduleContext'

export default function App() {
  return (
    <ScheduleProvider>
      <NavBar />
      <main>
        <Routes>
          <Route path="/" element={<BrowsePage />} />
          <Route path="/courses/:courseId" element={<CoursePage />} />
          <Route path="/schedule" element={<SchedulePage />} />
        </Routes>
      </main>
    </ScheduleProvider>
  )
}
