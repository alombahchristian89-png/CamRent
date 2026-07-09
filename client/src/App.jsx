import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/useAuth'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'
import { getSavedLanguage } from './utils/preferences'
import { translateDocumentText } from './utils/i18n'

// Auth Pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

// Tenant Pages
import Home from './pages/tenant/Home'
import PropertyList from './pages/tenant/PropertyList'
import PropertyDetail from './pages/tenant/PropertyDetail'
import TenantDashboard from './pages/tenant/Dashboard'
import Favorites from './pages/tenant/Favorites'
import Inquiries from './pages/tenant/Inquiries'
import TenantNotifications from './pages/tenant/Notifications'
import TenantRequests from './pages/tenant/Requests'
import TenantShell from './components/tenant/TenantShell'

// Landlord Pages
import LandlordDashboard from './pages/landlord/Dashboard'
import MyProperties from './pages/landlord/MyProperties'
import AddProperty from './pages/landlord/AddProperty'
import EditProperty from './pages/landlord/EditProperty'
import Verification from './pages/landlord/Verification'
import LandlordInquiries from './pages/landlord/Inquiries'
import LandlordNotifications from './pages/landlord/Notifications'
import LandlordRequests from './pages/landlord/Requests'

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminLandlords from './pages/admin/Landlords'
import AdminProperties from './pages/admin/Properties'
import AdminInquiries from './pages/admin/Inquiries'
import AdminNotifications from './pages/admin/Notifications'
import AdminAuditLogs from './pages/admin/AuditLogs'
import AdminSettings from './pages/admin/Settings'
import SettingsPage from './pages/shared/Settings'

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return children
}

// Public Route Component (redirect authenticated users)
const PublicRoute = ({ children, allowAuthenticated = false }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingSpinner />
  }

  if (user && !allowAuthenticated) {
    const redirectPath = user.role === 'admin' ? '/admin/dashboard' : 
                        user.role === 'landlord' ? '/landlord/dashboard' : 
                        '/tenant/dashboard'
    return <Navigate to={redirectPath} replace />
  }

  if (user && allowAuthenticated && location.pathname === '/register') {
    return children
  }

  return children
}

function App() {
  const [language, setLanguage] = useState('en')

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const syncLanguagePreference = () => {
      setLanguage(getSavedLanguage())
    }

    const onStorage = (event) => {
      if (event.key === 'camrent-language') {
        syncLanguagePreference()
      }
    }

    syncLanguagePreference()
    window.addEventListener('camrent:preferences-updated', syncLanguagePreference)
    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener('camrent:preferences-updated', syncLanguagePreference)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const rootNode = window.document.body
    if (!rootNode) return undefined

    window.document.documentElement.setAttribute('lang', language === 'fr' ? 'fr' : 'en')
    translateDocumentText(rootNode, language)

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData') {
          translateDocumentText(mutation.target.parentElement || rootNode, language)
          return
        }

        if (mutation.type === 'attributes') {
          if (mutation.target?.nodeType === Node.ELEMENT_NODE) {
            translateDocumentText(mutation.target, language)
          }
          return
        }

        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            translateDocumentText(node.parentElement || rootNode, language)
            return
          }

          if (node.nodeType === Node.ELEMENT_NODE) {
            translateDocumentText(node, language)
          }
        })
      })
    })

    observer.observe(rootNode, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label', 'value']
    })

    return () => {
      observer.disconnect()
    }
  }, [language])

  return (
    <div className="min-h-screen bg-background">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="properties" element={<PropertyList />} />
          <Route path="properties/:id" element={<PropertyDetail />} />
        </Route>

        {/* Auth Routes */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute allowAuthenticated>
            <Register />
          </PublicRoute>
        } />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Tenant Routes */}
        <Route path="/tenant" element={
          <ProtectedRoute allowedRoles={['tenant']}>
            <TenantShell />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<TenantDashboard />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="inquiries" element={<Inquiries />} />
          <Route path="requests" element={<TenantRequests />} />
          <Route path="notifications" element={<TenantNotifications />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Landlord Routes */}
        <Route path="/landlord" element={
          <ProtectedRoute allowedRoles={['landlord']}>
            <Layout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<LandlordDashboard />} />
          <Route path="properties" element={<MyProperties />} />
          <Route path="properties/add" element={<AddProperty />} />
          <Route path="properties/edit/:id" element={<EditProperty />} />
          <Route path="verification" element={<Verification />} />
          <Route path="inquiries" element={<LandlordInquiries />} />
          <Route path="requests" element={<LandlordRequests />} />
          <Route path="notifications" element={<LandlordNotifications />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="landlords" element={<AdminLandlords />} />
          <Route path="properties" element={<AdminProperties />} />
          <Route path="inquiries" element={<AdminInquiries />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
              <p className="text-gray-600 mb-8">Page not found</p>
              <a href="/" className="btn-primary">Go Home</a>
            </div>
          </div>
        } />
      </Routes>
    </div>
  )
}

export default App
