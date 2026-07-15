import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useQuery, useQueryClient } from 'react-query'
import { motion } from 'framer-motion'
import { useAuth } from '../context/useAuth'
import { formatDateLabel, getInitials } from './admin/adminUtils'
import { supabase } from '../services/supabaseClient'
import { notificationAPI } from '../services/api'
import { applyThemeMode, getSavedThemeMode } from '../utils/preferences'
import { clearSensitiveData } from '../utils/sessionCleanup'
import { translate } from '../utils/i18n'
import toast from 'react-hot-toast'
import { 
  Home, 
  Search, 
  Heart, 
  User, 
  Menu, 
  X, 
  LogOut,
  Building,
  Shield,
  MessageSquare,
  Bell,
  Inbox,
  ClipboardList,
  Settings,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Sparkles,
  BellDot
} from 'lucide-react'

const Layout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [adminSearch, setAdminSearch] = useState('')
  const [language, setLanguage] = useState('en')
  const { user, logout, isTenant, isLandlord, isAdmin, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const audioContextRef = useRef(null)

  const playNotificationSound = () => {
    try {
      if (typeof window === 'undefined') return

      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) return

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass()
      }

      const context = audioContextRef.current
      if (context.state === 'suspended') {
        context.resume().catch(() => {})
      }

      const oscillator = context.createOscillator()
      const gainNode = context.createGain()
      const now = context.currentTime

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, now)
      oscillator.frequency.exponentialRampToValueAtTime(660, now + 0.15)

      gainNode.gain.setValueAtTime(0.0001, now)
      gainNode.gain.exponentialRampToValueAtTime(0.09, now + 0.02)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)

      oscillator.connect(gainNode)
      gainNode.connect(context.destination)
      oscillator.start(now)
      oscillator.stop(now + 0.25)
    } catch {
      // Keep notification delivery non-blocking when audio cannot be played.
    }
  }

  const toObject = (value) => {
    if (value && typeof value === 'object') return value
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        return {}
      }
    }
    return {}
  }

  const getConversationMessages = useCallback((landlordResponse) => {
    const parsed = toObject(landlordResponse)
    if (Array.isArray(parsed.messages)) {
      return parsed.messages.filter((entry) => entry?.message)
    }
    if (parsed.message) {
      return [{ senderRole: 'landlord', message: parsed.message, createdAt: parsed.respondedAt }]
    }
    return []
  }, [])

  const inPortal = useMemo(() => {
    const rolePortalPath = /^\/(tenant|landlord|admin)(\/|$)/.test(location.pathname)
    const sharedTenantLandlordPath =
      location.pathname === '/'
      || location.pathname === '/properties'
      || location.pathname.startsWith('/properties/')

    return rolePortalPath || (!!user && !isAdmin && sharedTenantLandlordPath)
  }, [isAdmin, location.pathname, user])
  const isAdminPortal = isAdmin && /^\/admin(\/|$)/.test(location.pathname)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const width = window.innerWidth
    const isDesktop = width >= 1024
    const isLargeDesktop = width >= 1280

    if (isDesktop) {
      setIsSidebarCollapsed(!isLargeDesktop)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const syncThemeFromPreferences = () => {
      applyThemeMode(getSavedThemeMode())
    }

    const onSystemThemeChange = () => {
      if (getSavedThemeMode() === 'system') {
        syncThemeFromPreferences()
      }
    }

    const onStorage = (event) => {
      if (event.key === 'camrent-theme-mode') {
        syncThemeFromPreferences()
      }
    }

    syncThemeFromPreferences()

    window.addEventListener('camrent:preferences-updated', syncThemeFromPreferences)
    window.addEventListener('storage', onStorage)
    mediaQuery.addEventListener('change', onSystemThemeChange)

    return () => {
      window.removeEventListener('camrent:preferences-updated', syncThemeFromPreferences)
      window.removeEventListener('storage', onStorage)
      mediaQuery.removeEventListener('change', onSystemThemeChange)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const syncLanguagePreference = () => {
      const nextLanguage = window.localStorage.getItem('camrent-language')
      setLanguage(nextLanguage === 'fr' ? 'fr' : 'en')
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
    const userId = user?._id || user?.id
    if (!userId || !supabase) return undefined

    const channels = []

    const userNotificationChannel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const notification = payload?.new || {}
          playNotificationSound()
          toast.success(notification.message || notification.title || 'You have a new notification')
          queryClient.invalidateQueries('tenantNotifications')
          queryClient.invalidateQueries('landlordNotifications')
          queryClient.invalidateQueries('userNotifications')
        }
      )
      .subscribe()

    channels.push(userNotificationChannel)

    if (isLandlord) {
      const landlordInquiryChannel = supabase
        .channel(`landlord-inquiries-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'inquiries',
            filter: `landlord_id=eq.${userId}`
          },
          () => {
            playNotificationSound()
            toast.success('New tenant inquiry received')
            queryClient.invalidateQueries('landlordInquiries')
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'inquiries',
            filter: `landlord_id=eq.${userId}`
          },
          () => {
            queryClient.invalidateQueries('landlordInquiries')
          }
        )
        .subscribe()

      channels.push(landlordInquiryChannel)
    }

    if (isTenant) {
      const tenantPropertyChannel = supabase
        .channel(`tenant-properties-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'properties'
          },
          (payload) => {
            const newProperty = payload?.new || {}
            if (newProperty.is_active === false || newProperty.is_approved === false) {
              return
            }

            playNotificationSound()
            toast.success('New property added. Check latest listings!')
            queryClient.invalidateQueries('featuredProperties')
            queryClient.invalidateQueries('properties')
          }
        )
        .subscribe()

      const tenantInquiryChannel = supabase
        .channel(`tenant-inquiries-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'inquiries',
            filter: `tenant_id=eq.${userId}`
          },
          (payload) => {
            queryClient.invalidateQueries('tenantInquiries')
            queryClient.invalidateQueries('tenantStats')

            const previousMessages = getConversationMessages(payload?.old?.landlord_response)
            const nextMessages = getConversationMessages(payload?.new?.landlord_response)
            const previousLastMessage = previousMessages[previousMessages.length - 1]
            const nextLastMessage = nextMessages[nextMessages.length - 1]

            const landlordSentNewMessage =
              nextMessages.length > previousMessages.length
              && nextLastMessage?.senderRole === 'landlord'
              && nextLastMessage?.createdAt !== previousLastMessage?.createdAt

            if (landlordSentNewMessage) {
              playNotificationSound()
              toast.success('New reply from landlord')
            }
          }
        )
        .subscribe()

      channels.push(tenantPropertyChannel)
      channels.push(tenantInquiryChannel)
    }

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel)
      })
    }
  }, [getConversationMessages, isLandlord, isTenant, queryClient, user?._id, user?.id])

  const handleLogout = async () => {
    queryClient.clear()
    await clearSensitiveData()
    await logout()
    navigate('/')
    setIsMobileMenuOpen(false)
  }

  const isActivePath = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const { data: userNotificationSummary } = useQuery(
    ['userNotifications', { page: 1, limit: 1 }],
    () => notificationAPI.getMyNotifications({ page: 1, limit: 1 }),
    {
      enabled: (isTenant || isLandlord) && !!user,
      staleTime: 15000,
      select: (response) => response.data.data
    }
  )

  const userUnreadCount = userNotificationSummary?.unreadCount || 0

  const tenantNavItems = [
    { path: '/', label: translate(language, 'navHome', 'Home'), icon: Home },
    { path: '/properties', label: translate(language, 'navProperties', 'Properties'), icon: Search },
    { path: '/tenant/dashboard', label: translate(language, 'navDashboard', 'Dashboard'), icon: User },
    { path: '/tenant/favorites', label: translate(language, 'navFavorites', 'Favorites'), icon: Heart },
    {
      path: '/tenant/requests',
      label: translate(language, 'navRequests', 'Requests'),
      icon: Inbox,
      badgeCount: userUnreadCount
    },
    {
      path: '/tenant/notifications',
      label: translate(language, 'navNotifications', 'Notifications'),
      icon: Bell,
      badgeCount: userUnreadCount
    },
    { path: '/tenant/settings', label: translate(language, 'navSettings', 'Settings'), icon: Settings },
  ]

  const landlordNavItems = [
    { path: '/', label: translate(language, 'navHome', 'Home'), icon: Home },
    { path: '/landlord/dashboard', label: translate(language, 'navDashboard', 'Dashboard'), icon: User },
    { path: '/landlord/properties', label: translate(language, 'navMyProperties', 'My Properties'), icon: Building },
    { path: '/landlord/verification', label: translate(language, 'navVerification', 'Verification'), icon: Shield },
    { path: '/landlord/inquiries', label: translate(language, 'navInquiries', 'Inquiries'), icon: MessageSquare },
    {
      path: '/landlord/requests',
      label: 'Requests',
      icon: Inbox,
      badgeCount: userUnreadCount
    },
    {
      path: '/landlord/notifications',
      label: translate(language, 'navNotifications', 'Notifications'),
      icon: Bell,
      badgeCount: userUnreadCount
    },
    { path: '/landlord/settings', label: translate(language, 'navSettings', 'Settings'), icon: Settings },
  ]

  const adminNavItems = [
    { path: '/admin/dashboard', label: translate(language, 'navDashboard', 'Dashboard'), icon: Shield },
    { path: '/admin/users', label: translate(language, 'navUsers', 'Users'), icon: User },
    { path: '/admin/landlords', label: translate(language, 'navLandlords', 'Landlords'), icon: Building },
    { path: '/admin/properties', label: translate(language, 'navProperties', 'Properties'), icon: Search },
    { path: '/admin/inquiries', label: translate(language, 'navInquiries', 'Inquiries'), icon: MessageSquare },
    { path: '/admin/notifications', label: translate(language, 'navNotifications', 'Notifications'), icon: Bell },
    { path: '/admin/audit-logs', label: translate(language, 'navAuditLogs', 'Audit Logs'), icon: ClipboardList },
    { path: '/admin/settings', label: translate(language, 'navSettings', 'Settings'), icon: Settings },
  ]

  const quickActions = isAdmin
    ? [
        { path: '/admin/landlords', label: translate(language, 'quickReviewLandlords', 'Review Landlords'), icon: ShieldCheck },
        { path: '/admin/inquiries', label: translate(language, 'quickOpenInquiries', 'Open Inquiries'), icon: MessageSquare }
      ]
    : isLandlord
      ? []
      : isTenant
        ? [
            { path: '/tenant/inquiries', label: translate(language, 'quickMyInquiries', 'My Inquiries'), icon: MessageSquare }
          ]
        : []

  const navItems = isTenant ? tenantNavItems : 
                   isLandlord ? landlordNavItems : 
                   isAdmin ? adminNavItems : 
                   [{ path: '/', label: 'Home', icon: Home }]

  const profileSettingsPath = isAdmin
    ? '/admin/settings'
    : isLandlord
      ? '/landlord/settings'
      : isTenant
        ? '/tenant/settings'
        : '/'

  const openProfileSettings = () => {
    navigate(profileSettingsPath)
    setIsMobileMenuOpen(false)
  }

  const breadcrumbs = location.pathname
    .split('/')
    .filter(Boolean)
    .map((segment, index, all) => {
      const path = `/${all.slice(0, index + 1).join('/')}`
      const matched = navItems.find((item) => item.path === path)
      const label = matched?.label || segment.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())
      return { path, label }
    })

  if (loading) {
    return (
      <div className="min-h-screen app-main-gradient p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="h-16 rounded-2xl skeleton-shimmer" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-[70vh] rounded-2xl skeleton-shimmer" />
            <div className="md:col-span-3 h-[70vh] rounded-2xl skeleton-shimmer" />
          </div>
        </div>
      </div>
    )
  }

  if (isAdminPortal && user) {
    return (
      <div className="admin-shell min-h-screen">
        <div className="flex min-h-screen">
          <aside
            className={`admin-sidebar hidden lg:flex lg:sticky lg:top-0 lg:h-screen flex-col rounded-r-[32px] p-4 xl:p-5 transition-all duration-300 ${
              isSidebarCollapsed ? 'w-24' : 'w-[300px]'
            }`}
          >
            <div className="flex items-center gap-3 px-2 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-900/20">
                <Building className="h-5 w-5" />
              </div>
              {!isSidebarCollapsed && (
                <div>
                  <p className="text-sm font-semibold tracking-wide text-white">CAMRENT</p>
                  <p className="text-xs text-slate-400">Admin Portal</p>
                </div>
              )}
            </div>

            <nav className="mt-6 flex-1 space-y-1.5 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = isActivePath(item.path)
                return (
                  <motion.div
                    key={item.path}
                    whileHover={{ x: 4, scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link
                      to={item.path}
                      className={`admin-nav-link ${isActive ? 'admin-nav-link-active' : ''}`}
                      title={isSidebarCollapsed ? item.label : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!isSidebarCollapsed && (
                        <span className="flex w-full items-center justify-between gap-2">
                          <span>{item.label}</span>
                          {item.badgeCount > 0 ? (
                            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              {item.badgeCount > 99 ? '99+' : item.badgeCount}
                            </span>
                          ) : null}
                        </span>
                      )}
                    </Link>
                  </motion.div>
                )
              })}
            </nav>

            {!isSidebarCollapsed && quickActions.length > 0 && (
              <div className="mt-6 rounded-[26px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  Quick actions
                </div>
                <div className="space-y-2">
                  {quickActions.map((action) => {
                    const Icon = action.icon
                    return (
                      <Link
                        key={action.path}
                        to={action.path}
                        className="flex items-center justify-between rounded-2xl bg-white/6 px-3 py-2.5 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Icon className="h-4 w-4 text-blue-300" />
                          {action.label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-4 text-white backdrop-blur-sm">
              <button
                type="button"
                onClick={openProfileSettings}
                className="w-full text-left"
                title="Open profile settings"
              >
                <div className="flex items-center gap-3 rounded-2xl transition hover:bg-white/8 p-1.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 text-sm font-semibold">
                    {getInitials(user.name)}
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      <p className="text-xs text-slate-400">Super Administrator</p>
                    </div>
                  )}
                </div>
              </button>
              {!isSidebarCollapsed && (
                <button
                  onClick={handleLogout}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              )}
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="sticky top-0 z-40 px-4 pt-4 lg:px-6 lg:pt-5">
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="admin-surface px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                      className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-600 lg:hidden"
                      aria-label="Toggle menu"
                    >
                      {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                      className="hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-600 transition hover:border-slate-300 hover:text-slate-900 lg:inline-flex"
                      aria-label="Toggle sidebar"
                    >
                      {isSidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                    </button>
                  </div>

                  <label className="admin-filter-field min-w-[220px] flex-1">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={adminSearch}
                      onChange={(event) => setAdminSearch(event.target.value)}
                      placeholder="Search anything..."
                      className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                    />
                  </label>

                  <div className="ml-auto flex items-center gap-2">
                    <button className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-slate-300 hover:text-slate-900">
                      <BellDot className="h-5 w-5" />
                      <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500" />
                    </button>

                    <button
                      type="button"
                      onClick={openProfileSettings}
                      className="flex items-center gap-3 rounded-full bg-slate-50 px-2 py-1.5 transition hover:bg-slate-100"
                      title="Open profile settings"
                    >
                      <div className="hidden text-right sm:block">
                        <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500">{formatDateLabel(new Date(), { weekday: 'short' })}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-sm font-semibold text-white">
                        {getInitials(user.name)}
                      </div>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="px-4 pb-6 pt-4 lg:px-6 lg:pb-8">
              {breadcrumbs.length > 0 && (
                <div className="mb-4 flex items-center flex-wrap gap-1 text-sm text-slate-500">
                  {breadcrumbs.map((crumb, index) => (
                    <div key={crumb.path} className="inline-flex items-center gap-1">
                      {index < breadcrumbs.length - 1 ? (
                        <Link to={crumb.path} className="hover:text-primary transition-colors">{crumb.label}</Link>
                      ) : (
                        <span className="font-medium text-slate-900">{crumb.label}</span>
                      )}
                      {index < breadcrumbs.length - 1 && <ChevronRight className="h-3.5 w-3.5" />}
                    </div>
                  ))}
                </div>
              )}
              <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="min-w-0">
                <Outlet />
              </motion.main>
            </div>
          </div>
        </div>

        <div
          className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-300 ${
            isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div
            className="absolute inset-0 bg-slate-950/55"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div
            className={`admin-sidebar absolute top-0 left-0 h-full w-80 max-w-[86vw] p-4 transition-transform duration-300 ${
              isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">CAMRENT</p>
                  <p className="text-xs text-slate-400">Admin Portal</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-2xl bg-white/8 p-2 text-slate-200"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`admin-nav-link ${isActivePath(item.path) ? 'admin-nav-link-active' : ''}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex w-full items-center justify-between gap-2">
                      <span>{item.label}</span>
                      {item.badgeCount > 0 ? (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {item.badgeCount > 99 ? '99+' : item.badgeCount}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                )
              })}
            </nav>

            <button
              onClick={handleLogout}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/8 px-4 py-3 text-sm font-medium text-white"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen app-main-gradient">
      <header className="app-header sticky top-0 z-50 border-b border-white/40">
        <div className="app-container px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              {inPortal && user && (
                <button
                  onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                  className="hidden lg:inline-flex p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white/70 transition-colors"
                  aria-label="Toggle sidebar"
                >
                  {isSidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                </button>
              )}

              <Link to="/" className="flex items-center space-x-2">
                <Building className="h-7 w-7 text-primary" />
                <span className="text-lg font-bold text-primary tracking-tight">CAMRENT</span>
              </Link>
            </div>


            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white/70"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="app-container px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
        <div
          className={`flex items-start gap-4 lg:gap-6 ${
            inPortal && user ? 'lg:h-[calc(100vh-6rem)] lg:overflow-hidden' : ''
          }`}
        >
          {inPortal && user && (
            <aside
              className={`sidebar-glass hidden self-start overflow-hidden lg:flex lg:h-full flex-col transition-all duration-300 ${
                isSidebarCollapsed ? 'w-20' : 'w-72'
              }`}
            >
              <nav className="min-h-0 flex-1 overflow-y-auto p-3 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = isActivePath(item.path)
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                      title={isSidebarCollapsed ? item.label : undefined}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {!isSidebarCollapsed && (
                        <span className="flex w-full items-center justify-between gap-2 font-medium">
                          <span>{item.label}</span>
                          {item.badgeCount > 0 ? (
                            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              {item.badgeCount > 99 ? '99+' : item.badgeCount}
                            </span>
                          ) : null}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </nav>

              <div className="mt-auto border-t border-slate-200/70 p-3">
                {!isSidebarCollapsed && quickActions.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Quick Actions</p>
                    <div className="space-y-2">
                      {quickActions.map((action) => {
                        const Icon = action.icon
                        return (
                          <Link
                            key={action.path}
                            to={action.path}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-white/80 hover:bg-white text-slate-700 transition-colors"
                          >
                            <Icon className="h-4 w-4 text-primary" />
                            <span>{action.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <button
                    type="button"
                    onClick={openProfileSettings}
                    className="w-full text-left"
                    title="Open profile settings"
                  >
                    <div className="flex items-center gap-3 rounded-2xl transition hover:bg-slate-100 p-1.5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-200 text-sm font-semibold">
                        {getInitials(user?.name || '')}
                      </div>
                      {!isSidebarCollapsed && (
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
                          <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                        </div>
                      )}
                    </div>
                  </button>
                  {!isSidebarCollapsed && (
                    <button
                      onClick={handleLogout}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  )}
                </div>
              </div>
            </aside>
          )}

          <div className={`flex-1 min-w-0 ${inPortal && user ? 'lg:h-full lg:overflow-y-auto' : ''}`}>
            {inPortal && breadcrumbs.length > 0 && (
              <div className="mb-4 flex items-center flex-wrap gap-1 text-sm text-slate-500">
                {breadcrumbs.map((crumb, index) => (
                  <div key={crumb.path} className="inline-flex items-center gap-1">
                    {index < breadcrumbs.length - 1 ? (
                      <Link to={crumb.path} className="hover:text-primary transition-colors">{crumb.label}</Link>
                    ) : (
                      <span className="text-slate-800 font-medium">{crumb.label}</span>
                    )}
                    {index < breadcrumbs.length - 1 && <ChevronRight className="h-3.5 w-3.5" />}
                  </div>
                ))}
              </div>
            )}

            <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex-1">
              <Outlet />
            </motion.main>
          </div>
        </div>
      </div>

      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="absolute inset-0 bg-slate-900/35"
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <div
          className={`absolute top-0 left-0 h-full w-80 max-w-[85vw] bg-white shadow-xl transition-transform duration-300 ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={openProfileSettings}
              className="text-left rounded-lg px-1 py-0.5 transition hover:bg-slate-100"
              title="Open profile settings"
            >
              <p className="text-sm font-semibold text-slate-900">{user?.name || 'Guest'}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role || 'visitor'}</p>
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`nav-item ${isActivePath(item.path) ? 'nav-item-active' : ''}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex w-full items-center justify-between gap-2 font-medium">
                    <span>{item.label}</span>
                    {item.badgeCount > 0 ? (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {item.badgeCount > 99 ? '99+' : item.badgeCount}
                      </span>
                    ) : null}
                  </span>
                </Link>
              )
            })}

            {quickActions.length > 0 && (
              <div className="pt-3 mt-3 border-t border-slate-200">
                <p className="text-xs uppercase tracking-wide text-slate-500 px-2 mb-2">Quick Actions</p>
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <Link
                      key={action.path}
                      to={action.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="nav-item"
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="font-medium">{action.label}</span>
                    </Link>
                  )
                })}
              </div>
            )}

            {user ? (
              <button
                onClick={handleLogout}
                className="nav-item text-red-600 hover:bg-red-50 w-full mt-4"
              >
                <LogOut className="h-4 w-4" />
                <span className="font-medium">Logout</span>
              </button>
            ) : (
              <div className="pt-4 border-t space-y-2">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="block btn-outline text-center">Login</Link>
                <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className="block btn-primary text-center">Sign Up</Link>
              </div>
            )}
          </nav>
        </div>
      </div>

      {(!inPortal || !user) && (
        <footer className="mt-auto border-t border-white/50 bg-white/50 backdrop-blur-md">
          <div className="app-container px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center">
              <p className="text-slate-500 text-sm">© 2026 CAMRENT. Rental platform for Cameroon.</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}

export default Layout
