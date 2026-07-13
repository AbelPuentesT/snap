import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ApiRequestError } from '../api/client'

const centerStyle: React.CSSProperties = {
  maxWidth: 400,
  margin: '4rem auto',
  padding: '0 1rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  boxSizing: 'border-box',
}

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message)
      } else {
        setError('Error de conexión con el servidor')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={centerStyle}>
      <h1>Snap</h1>
      <h2>Iniciar sesión</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email">Email</label>
          <br />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="password">Contraseña</label>
          <br />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
        </div>
        {error && (
          <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '0.5rem 2rem' }}
        >
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
      <p style={{ marginTop: '1rem' }}>
        ¿No tenés cuenta?{' '}
        <Link to="/register">Registrate</Link>
      </p>
    </div>
  )
}
