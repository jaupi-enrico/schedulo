import { createContext, useContext, useState } from 'react'
import { api } from '../api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [logged, setLogged] = useState(false)

  const login = async (user, pass) => {
    await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ user, pass })
    })
    setLogged(true)
  }

  const logout = async () => {
    await api('/api/logout', { method: 'POST' })
    setLogged(false)
  }

  return (
    <AuthContext.Provider value={{ logged, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)