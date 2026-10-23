import { NavLink } from 'react-router-dom'
import { useSchedule } from '../ScheduleContext'

export default function NavBar() {
  const { scheduled } = useSchedule()

  return (
    <nav className="navbar">
      <span className="navbar__brand">Rutgers Schedule</span>
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
        Browse
      </NavLink>
      <NavLink to="/schedule" className={({ isActive }) => (isActive ? 'active' : '')}>
        My Schedule {scheduled.length > 0 && <span className="navbar__badge">{scheduled.length}</span>}
      </NavLink>
    </nav>
  )
}
