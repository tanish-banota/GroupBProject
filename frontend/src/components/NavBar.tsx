import { NavLink } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function NavBar() {
  const { user, profile, loading, signIn } = useAuth()

  return (
    <nav className="navbar">
      <span className="navbar__brand">Rutgers Schedule</span>
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
        Select courses
      </NavLink>
      <NavLink to="/schedule" className={({ isActive }) => (isActive ? 'active' : '')}>
        My Schedule
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
