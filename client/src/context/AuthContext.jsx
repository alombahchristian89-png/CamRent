import { useEffect, useState } from 'react'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'
import { getSavedLanguage, saveLanguage } from '../utils/preferences'
import { AuthContext } from './authContextStore'

const normalizeLanguage = (language, fallback = 'en') => {
  if (language === 'fr') return 'fr'
  if (language === 'en') return 'en'
  return fallback === 'fr' ? 'fr' : 'en'
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const persistUserAndLanguage = (userData, fallbackLanguage = getSavedLanguage()) => {
    const normalizedLanguage = normalizeLanguage(
      userData?.language || userData?.preferredLanguage,
      fallbackLanguage
    )

    const normalizedUser = {
      ...(userData || {}),
      language: normalizedLanguage,
      preferredLanguage: normalizedLanguage
    }

    saveLanguage(normalizedLanguage)
    localStorage.setItem('user', JSON.stringify(normalizedUser))
    setUser(normalizedUser)
    return normalizedUser
  }

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('accessToken')
      const userData = localStorage.getItem('user')
      
      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData)
          persistUserAndLanguage(parsedUser)
          
          // Verify token and hydrate latest profile (including language preference).
          const profileResponse = await authAPI.getProfile()
          const profileUser = profileResponse?.data?.data?.user
          if (profileUser) {
            persistUserAndLanguage(profileUser, getSavedLanguage())
          }
        } catch (error) {
          // Token is invalid, clear storage
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('user')
          setUser(null)
        }
      }
      setLoading(false)
    }

    loadUser()
  }, [])

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password })
      const { user: userData, accessToken, refreshToken } = response.data.data
      const normalizedUser = {
        ...userData,
        language: normalizeLanguage(userData.language || userData.preferredLanguage, getSavedLanguage())
      }
      normalizedUser.preferredLanguage = normalizedUser.language
      
      // Store tokens and user data
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)

      persistUserAndLanguage(normalizedUser)
      toast.success('Login successful!')
      return { success: true, user: userData }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData)
      const { user: newUser, accessToken, refreshToken } = response.data.data
      const normalizedUser = {
        ...newUser,
        language: normalizeLanguage(
          userData.language || userData.preferredLanguage || newUser.language || newUser.preferredLanguage,
          getSavedLanguage()
        )
      }
      normalizedUser.preferredLanguage = normalizedUser.language
      
      // Store tokens and user data
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)

      persistUserAndLanguage(normalizedUser)
      toast.success('Registration successful!')
      return { success: true, user: newUser }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
    toast.success('Logged out successfully')
  }

  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData)
      const responseUser = response?.data?.data?.user
      const nextLanguage = normalizeLanguage(
        responseUser?.language || responseUser?.preferredLanguage || profileData.language || profileData.preferredLanguage,
        getSavedLanguage()
      )
      persistUserAndLanguage({ ...(user || {}), ...(responseUser || {}), language: nextLanguage })
      toast.success('Profile updated successfully!')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const updateLanguagePreference = async (nextLanguage) => {
    const normalizedLanguage = normalizeLanguage(nextLanguage, getSavedLanguage())
    saveLanguage(normalizedLanguage)

    if (!user) {
      return { success: true, language: normalizedLanguage }
    }

    try {
      const response = await authAPI.updateProfile({
        language: normalizedLanguage,
        preferredLanguage: normalizedLanguage
      })

      const responseUser = response?.data?.data?.user
      persistUserAndLanguage({ ...(user || {}), ...(responseUser || {}), language: normalizedLanguage }, normalizedLanguage)
      return { success: true, language: normalizedLanguage }
    } catch (error) {
      const previousLanguage = normalizeLanguage(user.language || user.preferredLanguage, 'en')
      saveLanguage(previousLanguage)
      return {
        success: false,
        language: previousLanguage,
        error: error.response?.data?.message || 'Failed to update language preference'
      }
    }
  }

  const refreshToken = async () => {
    try {
      const refresh = localStorage.getItem('refreshToken')
      if (!refresh) {
        throw new Error('No refresh token')
      }

      const response = await authAPI.refreshToken({ refreshToken: refresh })
      const { accessToken, refreshToken: newRefreshToken } = response.data
      
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', newRefreshToken)
      
      return { success: true }
    } catch (error) {
      // Refresh token failed, logout user
      logout()
      return { success: false }
    }
  }

  const value = {
    user,
    setUser,
    loading,
    login,
    register,
    logout,
    updateProfile,
    updateLanguagePreference,
    refreshToken,
    isAuthenticated: !!user,
    isTenant: user?.role === 'tenant',
    isLandlord: user?.role === 'landlord',
    isAdmin: user?.role === 'admin',
    isVerifiedLandlord: user?.role === 'landlord' && user?.verificationStatus === 'approved'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
