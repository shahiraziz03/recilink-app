import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('recilink_user')
    return saved ? JSON.parse(saved) : null
  })

  const [token, setToken] = useState(() => localStorage.getItem('recilink_token') || null)

  const loginUser = (userData, accessToken) => {
    setUser(userData)
    setToken(accessToken)
    localStorage.setItem('recilink_user', JSON.stringify(userData))
    localStorage.setItem('recilink_token', accessToken)
  }

  const logoutUser = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('recilink_user')
    localStorage.removeItem('recilink_token')
  }

  return (
    <AuthContext.Provider value={{ user, token, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
