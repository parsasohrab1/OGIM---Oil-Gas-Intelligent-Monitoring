import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authAPI } from '../api/services'

interface AuthUser {
  id: number
  username: string
  email: string
  role: string
  disabled: boolean
  two_factor_enabled: boolean
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setIsLoading(false)
      return
    }
    authAPI
      .getCurrentUser()
      .then((currentUser: AuthUser) => setUser(currentUser))
      .catch(() => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (username: string, password: string) => {
    const tokenResponse = await authAPI.login(username, password)
    localStorage.setItem('access_token', tokenResponse.access_token)
    localStorage.setItem('refresh_token', tokenResponse.refresh_token)
    const currentUser = await authAPI.getCurrentUser()
    setUser(currentUser)
  }

  const logout = () => {
    authAPI.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
