import { NavLink } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { useSchedule } from '../ScheduleContext'

export default function NavBar() {
  const { scheduled } = useSchedule()
  const { user, profile, loading, signIn } = useAuth()

  return (
    <nav className="navbar">
      <span className="navbar__brand">Rutgers Schedule</span>
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
        Select courses
      </NavLink>
      <NavLink to="/schedule" className={({ isActive }) => (isActive ? 'active' : '')}>
        My Schedule {scheduled.length > 0 && <span className="navbar__badge">{scheduled.length}</span>}
      </NavLink>
      {user ? (
        <NavLink to="/account" className={({ isActive }) => (isActive ? 'active' : '')}>
          {profile?.display_name || user.email || 'Account'}
        </NavLink>
      ) : (
        <button type="button" onClick={() => void signIn()} disabled={loading}>
          Sign in with Google
        </button>
      )}
    </nav>
  )
}
