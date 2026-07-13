import { Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const navStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.75rem 2rem',
  background: '#f5f5f5',
  borderBottom: '1px solid #ddd',
}

const mainStyle: React.CSSProperties = {
  padding: '2rem',
  maxWidth: 960,
  margin: '0 auto',
}

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div>
      <nav style={navStyle}>
        <strong>Snap</strong>
        <span>
          {user?.name}
          <button
            onClick={logout}
            style={{ marginLeft: '1rem', padding: '0.25rem 0.75rem' }}
          >
            Cerrar sesión
          </button>
        </span>
      </nav>
      <main style={mainStyle}>
        <Outlet />
      </main>
    </div>
  )
}
