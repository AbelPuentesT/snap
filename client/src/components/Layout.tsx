import { Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 1.5rem',
        height: 56,
        borderBottom: '1px solid var(--border)',
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.02em' }}>
          ⚡ Snap
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user?.name}</span>
          <button className="btn-ghost" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </nav>
      <main style={{ flex: 1, maxWidth: 1000, width: '100%', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <Outlet />
      </main>
    </div>
  )
}
