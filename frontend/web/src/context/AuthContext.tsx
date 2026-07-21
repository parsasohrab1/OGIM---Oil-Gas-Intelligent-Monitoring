import { useEffect, useState, ReactNode } from 'react'
import { authAPI } from '../api/services'
import type { AuthUser } from './authContextTypes'
import { AuthContext } from './auth-context'

const GUEST_USER: AuthUser = {
  id: 0,
  username: 'guest',
  email: 'guest@sogf.local',
  role: 'system_admin',
  disabled: false,
  two_factor_enabled: false,
}

const DEV_USERNAME = 'admin'
const DEV_PASSWORD = 'Admin@123'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(GUEST_USER)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      // Prefer existing token if present
      const existing = localStorage.getItem('access_token')
      if (existing) {
        try {
          const currentUser = await authAPI.getCurrentUser()
          if (!cancelled) setUser(currentUser)
          return
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        }
      }

      // Silent auto-login so API calls work without a login screen
      try {
        const tokenResponse = await authAPI.login(DEV_USERNAME, DEV_PASSWORD)
        localStorage.setItem('access_token', tokenResponse.access_token)
        localStorage.setItem('refresh_token', tokenResponse.refresh_token)
        const currentUser = await authAPI.getCurrentUser()
        if (!cancelled) setUser(currentUser)
      } catch {
        // Auth service unavailable — keep guest session for open UI access
        if (!cancelled) setUser(GUEST_USER)
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
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
    setUser(GUEST_USER)
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: true, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}
