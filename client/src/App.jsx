import { Suspense, lazy, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/useAuth'
import LoadingSpinner from './components/LoadingSpinner'
import { getSavedLanguage } from './utils/preferences'
import { translateDocumentText } from './utils/i18n'

// Auth Pages
const Layout = lazy(() => import('./components/Layout'))
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))

// Tenant Pages
const Home = lazy(() => import('./pages/tenant/Home'))
const PropertyList = lazy(() => import('./pages/tenant/PropertyList'))
const PropertyDetail = lazy(() => import('./pages/tenant/PropertyDetail'))
const TenantDashboard = lazy(() => import('./pages/tenant/Dashboard'))
const Favorites = lazy(() => import('./pages/tenant/Favorites'))
const Inquiries = lazy(() => import('./pages/tenant/Inquiries'))
const TenantNotifications = lazy(() => import('./pages/tenant/Notifications'))
const TenantRequests = lazy(() => import('./pages/tenant/Requests'))
const TenantShell = lazy(() => import('./components/tenant/TenantShell'))

// Landlord Pages
const LandlordDashboard = lazy(() => import('./pages/landlord/Dashboard'))
const MyProperties = lazy(() => import('./pages/landlord/MyProperties'))
const AddProperty = lazy(() => import('./pages/landlord/AddProperty'))
const EditProperty = lazy(() => import('./pages/landlord/EditProperty'))
const Verification = lazy(() => import('./pages/landlord/Verification'))
const LandlordInquiries = lazy(() => import('./pages/landlord/Inquiries'))
const LandlordNotifications = lazy(() => import('./pages/landlord/Notifications'))
const LandlordRequests = lazy(() => import('./pages/landlord/Requests'))

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminUsers = lazy(() => import('./pages/admin/Users'))
const AdminLandlords = lazy(() => import('./pages/admin/Landlords'))
const AdminProperties = lazy(() => import('./pages/admin/Properties'))
const AdminInquiries = lazy(() => import('./pages/admin/Inquiries'))
const AdminNotifications = lazy(() => import('./pages/admin/Notifications'))
const AdminAuditLogs = lazy(() => import('./pages/admin/AuditLogs'))
const AdminSettings = lazy(() => import('./pages/admin/Settings'))
const AdminRevenue = lazy(() => import('./pages/admin/Revenue'))
const AdminViewings = lazy(() => import('./pages/admin/Viewings'))
const SettingsPage = lazy(() => import('./pages/shared/Settings'))

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
