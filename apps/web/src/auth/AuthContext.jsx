import { useCallback, useState } from 'react'
import { request } from '../api/client.js'
import { clearSession, getValidToken, saveSession } from './session.js'
import { AuthContext } from './useAuth.js'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getValidToken())

  const login = useCallback(async (email, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    saveSession(data.accessToken, data.expiresIn)
    setToken(data.accessToken)
    return data
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setToken(null)
  }, [])

  const isAuthenticated = Boolean(token && getValidToken())

  return (
    <AuthContext.Provider value={{ login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}
