import { Route, Routes, useLocation } from 'react-router-dom'
import NavBar from './components/NavBar'
import CoursePage from './pages/CoursePage'
import CourseSelectionPage from './pages/CourseSelectionPage'
import SchedulePage from './pages/SchedulePage'
import { ScheduleProvider } from './ScheduleContext'
import { useAuth } from './AuthContext'
import AccountPage from './pages/AccountPage'
import LoginPage from './pages/LoginPage'

export default function App() {
  const { pathname } = useLocation()
  const { error, loading, user } = useAuth()

  if (loading) return <main className="login-page"><p>Loading account…</p></main>
  if (!user) return <LoginPage />

  return (
    <ScheduleProvider key={user.id} userId={user.id}>
      <NavBar />
      <main className={pathname === '/schedule' ? 'main--wide' : undefined}>
        {error && <p role="alert" className="error auth-error">Account: {error}</p>}
        <Routes>
          <Route path="/" element={<CourseSelectionPage />} />
          <Route path="/courses/:courseId" element={<CoursePage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/account" element={<AccountPage />} />
        </Routes>
      </main>
    </ScheduleProvider>
  )
}
