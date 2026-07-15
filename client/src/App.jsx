import { Suspense, lazy, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/useAuth'
import LoadingSpinner from './components/LoadingSpinner'
import { getSavedLanguage } from './utils/preferences'
import { translateDocumentText } from './utils/i18n'

const lazyWithPreload = (factory) => {
  const Component = lazy(factory)
  Component.preload = factory
  return Component
}

const runWhenIdle = (callback, timeout = 1200) => {
  if (typeof window === 'undefined') return () => {}

  if (typeof window.requestIdleCallback === 'function') {
    const idleId = window.requestIdleCallback(callback, { timeout })
    return () => window.cancelIdleCallback(idleId)
  }

  const timeoutId = window.setTimeout(callback, 250)
  return () => window.clearTimeout(timeoutId)
}

// Auth Pages
const Layout = lazyWithPreload(() => import('./components/Layout'))
const Login = lazyWithPreload(() => import('./pages/auth/Login'))
const Register = lazyWithPreload(() => import('./pages/auth/Register'))
const ForgotPassword = lazyWithPreload(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazyWithPreload(() => import('./pages/auth/ResetPassword'))

// Tenant Pages
const Home = lazyWithPreload(() => import('./pages/tenant/Home'))
const PropertyList = lazyWithPreload(() => import('./pages/tenant/PropertyList'))
const PropertyDetail = lazyWithPreload(() => import('./pages/tenant/PropertyDetail'))
const TenantDashboard = lazyWithPreload(() => import('./pages/tenant/Dashboard'))
const Favorites = lazyWithPreload(() => import('./pages/tenant/Favorites'))
const Inquiries = lazyWithPreload(() => import('./pages/tenant/Inquiries'))
const TenantNotifications = lazyWithPreload(() => import('./pages/tenant/Notifications'))
const TenantRequests = lazyWithPreload(() => import('./pages/tenant/Requests'))
const TenantShell = lazyWithPreload(() => import('./components/tenant/TenantShell'))

// Landlord Pages
const LandlordDashboard = lazyWithPreload(() => import('./pages/landlord/Dashboard'))
const MyProperties = lazyWithPreload(() => import('./pages/landlord/MyProperties'))
const AddProperty = lazyWithPreload(() => import('./pages/landlord/AddProperty'))
const EditProperty = lazyWithPreload(() => import('./pages/landlord/EditProperty'))
const Verification = lazyWithPreload(() => import('./pages/landlord/Verification'))
const LandlordInquiries = lazyWithPreload(() => import('./pages/landlord/Inquiries'))
const LandlordNotifications = lazyWithPreload(() => import('./pages/landlord/Notifications'))
const LandlordRequests = lazyWithPreload(() => import('./pages/landlord/Requests'))

// Admin Pages
const AdminDashboard = lazyWithPreload(() => import('./pages/admin/Dashboard'))
const AdminUsers = lazyWithPreload(() => import('./pages/admin/Users'))
const AdminLandlords = lazyWithPreload(() => import('./pages/admin/Landlords'))
const AdminProperties = lazyWithPreload(() => import('./pages/admin/Properties'))
const AdminInquiries = lazyWithPreload(() => import('./pages/admin/Inquiries'))
const AdminNotifications = lazyWithPreload(() => import('./pages/admin/Notifications'))
const AdminAuditLogs = lazyWithPreload(() => import('./pages/admin/AuditLogs'))
const AdminSettings = lazyWithPreload(() => import('./pages/admin/Settings'))
const AdminRevenue = lazyWithPreload(() => import('./pages/admin/Revenue'))
const AdminViewings = lazyWithPreload(() => import('./pages/admin/Viewings'))
const SettingsPage = lazyWithPreload(() => import('./pages/shared/Settings'))

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
  const { user } = useAuth()
  const [language, setLanguage] = useState('en')

  useEffect(() => {
    const cancelIdleWork = runWhenIdle(() => {
      Layout.preload?.()
      Home.preload?.()
      PropertyList.preload?.()

      if (!user) {
        Login.preload?.()
        Register.preload?.()
        ForgotPassword.preload?.()
        return
      }

      if (user.role === 'tenant') {
        TenantShell.preload?.()
        TenantDashboard.preload?.()
        Favorites.preload?.()
        Inquiries.preload?.()
        TenantNotifications.preload?.()
        return
      }

      if (user.role === 'landlord') {
        LandlordDashboard.preload?.()
        MyProperties.preload?.()
        LandlordInquiries.preload?.()
        LandlordNotifications.preload?.()
        return
      }

      if (user.role === 'admin') {
        AdminDashboard.preload?.()
        AdminUsers.preload?.()
        AdminProperties.preload?.()
        AdminInquiries.preload?.()
      }
    })

    return cancelIdleWork
  }, [user?.role])

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

    // Dynamic DOM translation is only needed while French mode is active.
    if (language !== 'fr') {
      return undefined
    }

    const pendingNodes = new Set()
    let frameId = null

    const scheduleTranslate = (node) => {
      if (!node) return
      pendingNodes.add(node)

      if (frameId !== null) return
      frameId = window.requestAnimationFrame(() => {
        pendingNodes.forEach((pendingNode) => {
          translateDocumentText(pendingNode, language)
        })
        pendingNodes.clear()
        frameId = null
      })
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData') {
          scheduleTranslate(mutation.target?.parentElement || rootNode)
          return
        }

        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            scheduleTranslate(node.parentElement || rootNode)
            return
          }

          if (node.nodeType === Node.ELEMENT_NODE) {
            scheduleTranslate(node)
          }
        })
      })
    })

    observer.observe(rootNode, {
      childList: true,
      subtree: true,
      characterData: true
    })

    return () => {
      observer.disconnect()
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
      pendingNodes.clear()
    }
  }, [language])

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSpinner />}>
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
          <Route path="revenue" element={<AdminRevenue />} />
          <Route path="viewings" element={<AdminViewings />} />
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
      </Suspense>
    </div>
  )
}

export default App
