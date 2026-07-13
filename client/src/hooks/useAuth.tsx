import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import * as authApi from '../api/auth'

interface User {
  id: number
  email: string
  name: string
}

interface AuthContextValue {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function storedUser(): User | null {
  try {
    const raw = localStorage.getItem('snap_user')
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(storedUser)
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('snap_token'),
  )
  const navigate = useNavigate()

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login(email, password)
      localStorage.setItem('snap_token', res.token)
      localStorage.setItem('snap_user', JSON.stringify(res.user))
      setToken(res.token)
      setUser(res.user)
      navigate('/', { replace: true })
    },
    [navigate],
  )

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await authApi.register(email, password, name)
      localStorage.setItem('snap_token', res.token)
      localStorage.setItem('snap_user', JSON.stringify(res.user))
      setToken(res.token)
      setUser(res.user)
      navigate('/', { replace: true })
    },
    [navigate],
  )

  const logout = useCallback(() => {
    localStorage.removeItem('snap_token')
    localStorage.removeItem('snap_user')
    setToken(null)
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate])

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
