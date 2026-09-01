import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import apiClient from '@/lib/api-client'

const AuthContext = createContext(null)

/**
 * AuthProvider — menyimpan state user yang sedang login.
 *
 * Strategi:
 * - Saat mount, cek ke /auth/me apakah cookie masih valid
 * - Jika valid → set user, redirect ke dashboard
 * - Jika 401 → user null, tampilkan login
 * - Tidak ada refresh token — cookie expire sendiri tengah malam
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true) // true saat initial check

  // Check apakah sesi masih aktif (cookie masih valid)
  const checkSession = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/me')
      setUser(res.data.data.user)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  const login = useCallback(async (username, password) => {
    const res = await apiClient.post('/auth/login', { username, password })
    setUser(res.data.data.user)
    return res.data.data
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      setUser(null)
    }
  }, [])

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    checkSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook untuk mengakses auth context.
 * @returns {{ user, isLoading, isAuthenticated, login, logout }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return ctx
}
