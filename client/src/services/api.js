import axios from 'axios'
import { clearSensitiveData } from '../utils/sessionCleanup'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

// Create axios instance
const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000, // Increased to 30 seconds for file uploads
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const response = await axios.post(`${apiBaseUrl}/auth/refresh`, {
            refreshToken
          })
          
          const { accessToken, refreshToken: newRefreshToken } = response.data.data
          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', newRefreshToken)
          
          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        await clearSensitiveData()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  refreshToken: (tokens) => api.post('/auth/refresh', tokens),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  forgotPassword: (email) => api.post('/auth/forgot-password', email),
  resetPassword: (data) => api.post('/auth/reset-password', data),
}

// Properties API
export const propertyAPI = {
  getProperties: (params) => api.get('/properties', { params }),
  getPropertyById: (id) => api.get(`/properties/${id}`),
  createProperty: (propertyData) => api.post('/properties', propertyData),
  updateProperty: (id, propertyData) => api.put(`/properties/${id}`, propertyData),
  deleteProperty: (id) => api.delete(`/properties/${id}`),
  getLandlordProperties: (params) => api.get('/properties/landlord/my-properties', { params }),
}

// Favorites API
export const favoriteAPI = {
  addFavorite: (propertyId) => api.post('/favorites', { propertyId }),
  removeFavorite: (propertyId) => api.delete(`/favorites/${propertyId}`),
  getFavorites: (params) => api.get('/favorites', { params }),
  checkFavorite: (propertyId) => api.get(`/favorites/check/${propertyId}`),
}

// Inquiries API
export const inquiryAPI = {
  sendInquiry: (inquiryData) => api.post('/inquiries', inquiryData),
  getTenantInquiries: (params) => api.get('/inquiries/tenant', { params }),
  getLandlordInquiries: (params) => api.get('/inquiries/landlord', { params }),
  getTenantStats: () => api.get('/inquiries/tenant/stats'),
  sendInquiryMessage: (id, messageData) => api.post(`/inquiries/${id}/messages`, messageData),
  markInquiryAsRead: (id) => api.post(`/inquiries/${id}/read`),
  respondToInquiry: (id, responseData) => api.put(`/inquiries/${id}/respond`, responseData),
  closeInquiry: (id) => api.put(`/inquiries/${id}/close`),
}

// Tenant Notifications API
export const notificationAPI = {
  getMyNotifications: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  sendPropertyRequest: (requestData) => api.post('/notifications/requests', requestData),
  respondToPropertyRequest: (payload) => api.post('/notifications/requests/respond', payload)
}

// Landlord API
export const landlordAPI = {
  submitVerification: (verificationData) => api.post('/landlord/verify', verificationData),
  getVerificationStatus: () => api.get('/landlord/verification-status'),
  getDashboard: () => api.get('/landlord/dashboard'),
}

// Upload API
export const uploadAPI = {
  uploadPropertyImages: (formData) => api.post('/upload/property-images', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  uploadPropertyVideos: (formData) => api.post('/upload/property-videos', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  uploadDocuments: (formData) => api.post('/upload/documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  uploadProfileImage: (formData) => api.post('/upload/profile-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  deleteFile: (url) => api.delete('/upload/file', { data: { url } })
}

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getPropertyReports: () => api.get('/admin/reports/properties'),
  getLandlords: (params) => api.get('/admin/landlords', { params }),
  verifyLandlord: (id, verificationData) => api.put(`/admin/verify/${id}`, verificationData),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData),
  updateUserPassword: (id, passwordData) => api.put(`/admin/users/${id}/password`, passwordData),
  banUser: (id, banData) => api.put(`/admin/users/${id}/ban`, banData),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  updateUserRole: (id, roleData) => api.put(`/admin/users/${id}/role`, roleData),
  resetUserPassword: (id) => api.post(`/admin/users/${id}/reset-password`),
  getInquiries: (params) => api.get('/admin/inquiries', { params }),
  decryptInquiry: (id) => api.get(`/admin/inquiries/${id}/decrypt`),
  getNotifications: (params) => api.get('/admin/notifications', { params }),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getProperties: (params) => api.get('/admin/properties', { params }),
  deleteProperty: (id) => api.delete(`/admin/properties/${id}`),
}

export default api
